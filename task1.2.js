
const USE_RAM = process.env.USE_RAM == 1 || false // use implementation to load files into RAM or STREAMS (stream by default)
console.debug(`You're about to run ${USE_RAM ? 'full RAM' : 'stream'} implementation`)

const csv2json = require('csvtojson'),
    { readdir, stat } = require('fs/promises'),
    { basename, extname, resolve } = require('path'),
    fs = require('fs');

let pipeline;


const directory = 'csv';

(async () => {
    let files
    try {
        files = await readdir(directory)
        files.forEach(name => doFile(resolve(directory, name)))
    } catch (ee) {
        console.error(`Failed to read ${directory}: ${ee}`)
    }
})()

async function doFile(file) {
    try {
        const fileStat = await stat(file)
        const file_extname = extname(file)
        if (fileStat?.isFile() && file_extname === '.csv') {
            console.log('...File ' + file)
            await processCsv(file,
                resolve(directory, basename(file, file_extname) + '.txt'))
        }
    } catch(ee) {
        console.error(`Failed to process file ${file}: ${ee}`)
    }
}

async function processCsvRAM(inputPath, outputPath) {
    return new Promise((rslv, rjct) => {
        const resp_json = []
        csv2json()
        .fromFile(inputPath)
        .subscribe((json) => {
            resp_json.push(JSON.stringify(json))
        },
        (error) => rjct(error),
        () => fs.writeFile(outputPath, resp_json.join('\r\n'), (err) => {
            if (err) rjct(err)
            else rslv()
        }))
    })
    
}

async function processCsvStream(inputPath, outputPath) {
    if (!pipeline) {
        pipeline = require('util').promisify(require('stream').pipeline);
    }

    // using node 14 lts
    await pipeline(
        fs.createReadStream(inputPath),
        csv2json(),
        fs.createWriteStream(outputPath)
    )
}

const processCsv = (USE_RAM)? processCsvRAM : processCsvStream
