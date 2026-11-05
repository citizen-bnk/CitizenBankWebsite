"""Allowlisted catalogue maintenance; never accepts arbitrary tables or columns."""
import hashlib
import json
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field

CATALOGUES = {
    'categories': ('data_room_categories', ['id','category_name','description','display_order','is_active']),
    'roles': ('roles', ['id','role_name','description']),
}

class CategoryValues(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    category_name: str = Field(min_length=2,max_length=100)
    description: str = Field(default='',max_length=1000)
    display_order: int = Field(default=0,ge=0,le=10000)
    is_active: bool = True

class RoleValues(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    description: str = Field(max_length=1000)

def catalogue_config(name):
    if name not in CATALOGUES:
        raise HTTPException(404,'This reference catalogue is not available.')
    return CATALOGUES[name]

def token(row):
    return hashlib.sha256(json.dumps(dict(row),sort_keys=True,default=str).encode()).hexdigest()

async def require_schema(conn, table):
    if not await conn.fetchval('SELECT to_regclass($1)', 'public.'+table):
        raise HTTPException(409,'Run reference setup before editing this catalogue.')
    if not await conn.fetchval("SELECT to_regclass('public.reference_data_runs')"):
        raise HTTPException(409,'Run reference setup before editing this catalogue.')
    fields=next(fields for name,fields in CATALOGUES.values() if name==table)
    count=await conn.fetchval('''SELECT count(*) FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1 AND column_name=ANY($2::text[])''',table,fields)
    if count!=len(fields):
        raise HTTPException(409,'Reference settings need a schema update. Preview and apply reference setup.')

async def list_records(conn, name):
    table,fields=catalogue_config(name)
    await require_schema(conn,table)
    rows=await conn.fetch(f"SELECT {','.join(fields)} FROM {table} ORDER BY id")
    return {'catalogue':name,'records':[{**dict(row),'revision':token(row)} for row in rows]}

async def save_record(conn,name,record_id,values,revision,actor):
    table,fields=catalogue_config(name)
    if name=='roles' and record_id is None:
        raise HTTPException(422,'Security role codes are controlled. Edit an existing role description.')
    model=CategoryValues if name=='categories' else RoleValues
    from pydantic import ValidationError
    try:
        data=model.model_validate(values).model_dump()
    except ValidationError:
        raise HTTPException(422,'Check the field values. Only the displayed catalogue fields can be changed.') from None
    async with conn.transaction():
        await conn.execute("SELECT pg_advisory_xact_lock(hashtext('citizen:reference-data'))")
        await require_schema(conn,table)
        before=None
        if record_id is not None:
            before=await conn.fetchrow(f"SELECT {','.join(fields)} FROM {table} WHERE id=$1 FOR UPDATE",record_id)
            if not before: raise HTTPException(404,'This record no longer exists. Refresh the list.')
            if not revision or token(before)!=revision:
                raise HTTPException(409,'This record changed. Refresh the list before saving again.')
        if name=='categories':
            duplicate=await conn.fetchval('''SELECT EXISTS(SELECT 1 FROM data_room_categories
                WHERE lower(trim(category_name))=lower(trim($1)) AND ($2::integer IS NULL OR id<>$2))''',data['category_name'],record_id)
            if duplicate: raise HTTPException(409,'A category with this name already exists, including archived records.')
        keys=list(data)
        if record_id is None:
            sql=f"INSERT INTO {table} ({','.join(keys)}) VALUES ({','.join('$'+str(i+1) for i in range(len(keys)))}) RETURNING {','.join(fields)}"
            row=await conn.fetchrow(sql,*data.values())
        else:
            sql=f"UPDATE {table} SET {','.join(k+'=$'+str(i+1) for i,k in enumerate(keys))} WHERE id=${len(keys)+1} RETURNING {','.join(fields)}"
            row=await conn.fetchrow(sql,*data.values(),record_id)
        change={'action':'created' if before is None else 'updated','table':table,'id':row['id'],
                'before':dict(before) if before else None,'after':dict(row)}
        await conn.execute('INSERT INTO reference_data_runs(version,actor,changes) VALUES($1,$2,$3::jsonb)',
                           'reference-settings',actor,json.dumps([change],default=str))
        return {**dict(row),'revision':token(row)}
