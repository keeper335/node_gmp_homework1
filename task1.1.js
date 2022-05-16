const EventEmitter = require('events');
const reverser = new EventEmitter();
reverser.on('line', function(data) {
    this.emit('output', Array.from(data).reverse().join(''))
});

reverser.on('output', console.log);
reverser.line = reverser.emit.bind(reverser, 'line');

let stdin_data = '';
process.stdin.on('data', (chunk) => {
    stdin_data += chunk;
    let lines = stdin_data.split(/\r\n|\n/)
    stdin_data = lines.pop()
    lines.forEach(line => reverser.line(line))
})
.on('end', () => reverser.line(stdin_data));

