#!/usr/bin/env node
/*
 * TiddlyWiki Classic Split Tool
 * 
 * This script loads a TiddlyWiki Classic file and will eventually split it into individual .tid files.
 * Currently implements only the loading functionality, similar to index.js.
 * 
 * TODO: Implement the actual splitting functionality to extract tiddlers as .tid files
 */

const fs = require('fs')
const path = require('path')

const { extractTiddlersFromHtml } = require('./tw-parser')

const exitWithError = (message) => {
    console.error('⚠️  Error: ' + message)
    process.exit(1)
}

// Skip path to node, path to script
const args = process.argv.slice(2)

const inputFlagName = '--input'
const outputFlagName = '--output'
const inputFlagPlaceholder = '<file_path>'
const outputFlagPlaceholder = '<output_directory>'

const inputFlagIndex = args.indexOf(inputFlagName)
const outputFlagIndex = args.indexOf(outputFlagName)

// Validate input argument
if (inputFlagIndex === -1 || inputFlagIndex === args.length - 1) exitWithError(
    `Usage: node split.js ${inputFlagName} ${inputFlagPlaceholder} ${outputFlagName} ${outputFlagPlaceholder}`
)

// Validate output argument
if (outputFlagIndex === -1 || outputFlagIndex === args.length - 1) exitWithError(
    `Usage: node split.js ${inputFlagName} ${inputFlagPlaceholder} ${outputFlagName} ${outputFlagPlaceholder}`
)

const providedTwPath = args[inputFlagIndex + 1]
const providedOutputPath = args[outputFlagIndex + 1]

const loadTwFile = (twPath, outputPath) => {
    // Resolve the paths relative to current working directory
    const absoluteTwPath = path.resolve(twPath)
    const absoluteOutputPath = path.resolve(outputPath)
    
    // Validate input file existence and accessibility
    if(!fs.existsSync(absoluteTwPath)) exitWithError(`File ${absoluteTwPath} does not exist`)
    if(!fs.statSync(absoluteTwPath).isFile()) exitWithError(`${absoluteTwPath} is not a file`)
    
    // Validate and prepare output directory
    if(fs.existsSync(absoluteOutputPath)) {
        if(!fs.statSync(absoluteOutputPath).isDirectory()) {
            exitWithError(`Output path ${absoluteOutputPath} exists but is not a directory`)
        }
    } else {
        try {
            fs.mkdirSync(absoluteOutputPath, { recursive: true })
        } catch (error) {
            exitWithError(`Failed to create output directory ${absoluteOutputPath}: ${error.message}`)
        }
    }
    
    try {
        const twContent = fs.readFileSync(absoluteTwPath, 'utf8')
        
        return {
            twContent,
            absoluteTwPath,
            absoluteOutputPath
        }
    } catch (error) {
        exitWithError(`Failed to read file: ${error.message}`)
    }
}

(function main() {
    console.log(`Loading TiddlyWiki file: ${providedTwPath}`)
    console.log(`Output directory: ${providedOutputPath}`)

    const { twContent, absoluteTwPath, absoluteOutputPath } = loadTwFile(providedTwPath, providedOutputPath)

    if(absoluteOutputPath !== path.resolve(providedOutputPath)) {
        console.log(`Created output directory: ${absoluteOutputPath}`)
    }
    console.log(`Successfully loaded TiddlyWiki file from ${absoluteTwPath} (${twContent.length} characters)`)

    console.log('Extracting tiddlers...')
    const { tiddlers, warning } = extractTiddlersFromHtml(twContent)
    if(warning) {
        console.warn(`Warning: ${warning}`)
    }

    // for problematic tiddlers, warn and skip
    const validTiddlers = tiddlers.filter(tiddler => {
        if (tiddler.error) {
            console.warn(`Warning: ${tiddler.error}`)
            return false
        }
        return true
    })

    console.log(`Found ${validTiddlers.length} tiddlers`)

    // Display summary of extracted tiddlers
    if(validTiddlers.length > 0) {
        console.log('\nTiddlers found:')
        validTiddlers.forEach((tiddler, index) => {
            const textPreview = tiddler.text.length > 50 
                ? tiddler.text.substring(0, 50) + '...' 
                : tiddler.text
            console.log(`  ${index + 1}. "${tiddler.title}" (${tiddler.text.length} chars) - ${textPreview.replace(/\n/g, ' ')}`)
        })
    } else {
        console.log('\nNo tiddlers found.')
    }

    // TODO: Create individual .tid files for each tiddler in ${absoluteOutputPath}
    // TODO: Organize output into a directory structure
    
    console.log('\nTiddler extraction complete. .tid file creation not yet implemented.')
})()
