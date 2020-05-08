<div align="center">
  <img src="http://toolboxsv.com/git/hackathon0118/icon_blue.png" width="200" />
</div>

# Digital ID SV Javascript Blockchain

### Objetivo
El objetivo de este proyecto se centra en una hackaton realizada en 2018, busca demostrar una correcta implementacion de blockchain para guardar la identidad de una persona.
El enfoque de este proyecto es hacia una identidad digital fragmentada, la cual estaria disponible para el usuario y para cualquier entidad que la requiera.

### ¿Blockchain?
Blockchain se podria reconocer como una base de datos administrada por una cantidad N de nodos en una red mundial, esta base de datos se le atribuye el reconocimiento de ser una entidad descentralizada, quiere decir que cada nodo de la red tiene el mismo nivel y internamente los nodos validan todo tipo de registros que se quieran incorporar.

### Tecnologias
Digital ID SV utiliza las siguientes tecnologias en Node.js:

* [CryptoJS] - Util para criptografia.
* [WebSocket] - Canal de comunicacion live entre los nodos de la red.
* [bodyParser] - Encargado de parsear.

### Instalacion

Digital ID SV reqiuiere [Node.js](https://nodejs.org/)

Instala las dependencias y corre el proyecto
```sh
$ npm install 
node app.js
```

### API

El blockchain tiene una API disponible para consultar y añadir datos.

#### Cadena de bloques
* Endpoint: [URL_BASE]/blocks
* Descripción: Retorna la serie de bloques registrados en el blockchain desde el bloque genesis.
* Endpoint: [URL_BASE]/mineBlock
* Descripción: Representa la funcion de minado de un bloque.

#### Nodos
* Endpoint: [URL_BASE]/peers
* Descripción: Permite obtener el listado de nodos conectados a la red.
* Endpoint: [URL_BASE]/addPeer
* Descripción: Permite añadir un nodo a la red.

#### Fragmentos de identidad
* Endpoint: [URL_BASE]/fragments
* Descripción: Obtiene los fragmentos en cola por agregar al siguiente bloque minado.
* Endpoint: [URL_BASE]/addFragment
* Descripción: Permite añadir un fragmento de identidad a la cola.
