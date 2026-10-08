export function serviceURL(service:'hub'|'banking'|'app',path='/'){
 const raw=service==='hub'?process.env.HUB_URL:service==='banking'?process.env.BANKING_URL:process.env.APP_URL;
 if(!raw)throw new Error(`Citizen ${service} address is not configured.`);
 const base=new URL(raw);
 if(base.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&base.hostname==='localhost'))throw new Error('Citizen service address must use HTTPS.');
 return new URL(path,base).href;
}
export const serviceRoutes:Record<string,{service:'hub'|'banking'|'app';path:string}>={
 'login':{service:'hub',path:'/login'},'auth/sign-in':{service:'hub',path:'/login'},'demo':{service:'hub',path:'/login'},'profile':{service:'hub',path:'/profile'},'invest':{service:'hub',path:'/investors'},'investor-relations':{service:'hub',path:'/investors'},'investor-portal':{service:'hub',path:'/investors'},'my-subscriptions':{service:'hub',path:'/investors'},'board-portal':{service:'hub',path:'/board'},'board':{service:'hub',path:'/board'},'back-office':{service:'hub',path:'/executive'},'admin':{service:'hub',path:'/settings'},'documents':{service:'hub',path:'/documents'},'hub':{service:'hub',path:'/'},'open-account':{service:'banking',path:'/register'},'internet-banking':{service:'banking',path:'/login'},'mobile-banking':{service:'app',path:'/login'}
};
