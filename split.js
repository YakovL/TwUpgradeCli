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
const { formatTiddlerAsTid, generateTidFilename } = require('./tid-formatter')

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
        console.log('\nCleaning output directory and ensuring it exists...')
        try {
            if(fs.existsSync(absoluteOutputPath)) {
                fs.rmSync(absoluteOutputPath, { recursive: true, force: true })
            }
            fs.mkdirSync(absoluteOutputPath, { recursive: true })
            console.log(`✅ Output directory ready: ${absoluteOutputPath}`)
        } catch (error) {
            console.error(`❌ Failed to prepare output directory: ${error.message}`)
            return
        }

        console.log('\nWriting .tid files...')
        console.log('=' .repeat(50))

        let successCount = 0
        let errors = []

        validTiddlers.forEach((tiddler) => {
            const filename = generateTidFilename(tiddler.title)
            const tidContent = formatTiddlerAsTid(tiddler)
            const filePath = path.join(absoluteOutputPath, filename)

            try {
                fs.writeFileSync(filePath, tidContent, 'utf8')
                successCount++
                // Show progress every 50 tiddlers or for the last one
                if (successCount % 50 === 0 || successCount === validTiddlers.length) {
                    console.log(`📝 Progress: ${successCount}/${validTiddlers.length} tiddlers written...`)
                }
            } catch (error) {
                errors.push({ title: tiddler.title, error })
            }
        })

        // Create split.recipe file
        const recipePath = path.join(absoluteOutputPath, 'split.recipe')
        try {
            const recipeContent = validTiddlers
                .sort((a, b) => {
                    // Temporal custom sort to match original split.recipe sorting:
                    // Uppercase letters first, then lowercase
                    const titleA = a.title;
                    const titleB = b.title;
                    const len = Math.min(titleA.length, titleB.length);
                    
                    for (let i = 0; i < len; i++) {
                        const charA = titleA.charCodeAt(i);
                        const charB = titleB.charCodeAt(i);
                        
                        // If characters are the same, continue to next character
                        if (charA === charB) continue;
                        
                        // Uppercase letters (65-90) come before lowercase (97-122)
                        const isAUpper = charA >= 65 && charA <= 90;
                        const isBUpper = charB >= 65 && charB <= 90;
                        
                        if (isAUpper && !isBUpper) return -1;
                        if (!isAUpper && isBUpper) return 1;
                        
                        // If both are same case, do normal comparison
                        return charA - charB;
                    }
                    
                    // If we get here, one string is a prefix of the other
                    return titleA.length - titleB.length;
                })
                .map(tiddler => `tiddler: ${generateTidFilename(tiddler.title)}`)
                .join('\n\n')

            fs.writeFileSync(recipePath, recipeContent, 'utf8')
            console.log(`\n📄 Created recipe file: ${recipePath}`)
        } catch (error) {
            console.warn(`\n⚠️  Failed to create recipe file: ${error.message}`)
        }

        // report results
        console.log(`\n🎉 Successfully wrote ${successCount}/${validTiddlers.length} .tid files to ${absoluteOutputPath}`)
        if (errors.length > 0) {
            console.log(`\n❌ ${errors.length} tiddlers failed to write:`)
            errors.forEach(({ title, error }) => {
                console.log(`   • ${title}: ${error}`)
            })
        }
    } else {
        console.log('\nNo tiddlers found.')
    }
})()
