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

const exitWithError = (message) => {
    console.error('⚠️  Error: ' + message)
    process.exit(1)
}

// Skip path to node, path to script
const args = process.argv.slice(2)

const inputFlagName = '--input'
const inputFlagPlaceholder = '<file_path>'
const inputFlagIndex = args.indexOf(inputFlagName)

if (inputFlagIndex === -1 || inputFlagIndex === args.length - 1) exitWithError(
    `Usage: node split.js ${inputFlagName} ${inputFlagPlaceholder}`
)

const providedTwPath = args[inputFlagIndex + 1]

const loadTwFile = (twPath) => {
    // Resolve the path relative to current working directory
    const absoluteTwPath = path.resolve(twPath)
    
    // Validate file existence and accessibility
    if(!fs.existsSync(absoluteTwPath)) exitWithError(`File ${absoluteTwPath} does not exist`)
    if(!fs.statSync(absoluteTwPath).isFile()) exitWithError(`${absoluteTwPath} is not a file`)
    
    console.log(`Loading TiddlyWiki file: ${absoluteTwPath}`)
    
    try {
        const twContent = fs.readFileSync(absoluteTwPath, 'utf8')
        console.log(`Successfully loaded TiddlyWiki file (${twContent.length} characters)`)
        
        // TODO: Parse the TW content and extract tiddlers
        // TODO: Create individual .tid files for each tiddler
        // TODO: Organize output into a directory structure
        
        console.log('Split functionality not yet implemented. File loaded successfully.')
        return twContent
    } catch (error) {
        exitWithError(`Failed to read file: ${error.message}`)
    }
}

// Execute the main function
loadTwFile(providedTwPath)
