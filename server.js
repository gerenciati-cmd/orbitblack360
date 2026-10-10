const app = require('./src/app');
const { port } = require('./src/config');

app.listen(port, () => console.log(`OrbitBlack360 escuchando en puerto ${port}`));
