"""Small adapter for the restored meeting API's cursor-shaped queries.

All values remain asyncpg parameters. Each cursor block is one atomic transaction.
"""
class BoardConnection:
    def __init__(self,connection): self.connection=connection
    def __getattr__(self,name): return getattr(self.connection,name)
    def cursor(self): return BoardCursor(self.connection)

class BoardCursor:
    def __init__(self,connection): self.connection=connection;self.rows=[];self.rowcount=0
    async def __aenter__(self):
        self.tx=self.connection.transaction();await self.tx.start();return self
    async def __aexit__(self,kind,value,tb):
        if kind:await self.tx.rollback()
        else:await self.tx.commit()
    async def execute(self,query,*args):
        self.rows=list(await self.connection.fetch(query,*args))
        self.rowcount=len(self.rows)
    async def fetchone(self):return self.rows.pop(0) if self.rows else None
    async def fetchall(self):rows=self.rows;self.rows=[];return rows
