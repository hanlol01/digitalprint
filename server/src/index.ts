import { env } from "./config/env";
import { app } from "./app";

app.listen(env.PORT, () => {
  console.log(`API BizPrint Pro berjalan di http://localhost:${env.PORT}`);
});
