
const csv2json = require('node-csvtojson'),
    { readdir, stat } = require('fs/promises'),
    { basename, extname, resolve } = require('path'),
    fs = require('fs');

const pipeline = require('util').promisify(require('stream').pipeline);


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
    console.log('...File ' + file)
    try {
        let fileStat = await stat(file)
        if (fileStat?.isFile()) {
            await processCsvOld(file,
                resolve(directory, basename(file, extname(file)) + '.txt'))
        }
    } catch(ee) {
        console.error(`Failed to process file ${file}: ${ee}`)
    }
}

async function processCsvOld(inputPath, outputPath) {
    // using node 14 lts
    await pipeline(
        fs.createReadStream(inputPath),
        csv2json(),
        fs.createWriteStream(outputPath)
    )
}

