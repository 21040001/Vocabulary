import app from'./app';import{env}from'./config/env';app.listen(env.port,()=>console.log(`Vocabulary API running on port ${env.port}`));
