#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const exitWithError = (message) => {
    console.error(message)
    process.exit(1)
}

// Skip path to node, path to script
const args = process.argv.slice(2)

const inputFlagName = '--input'
const inputFlagPlaceholder = '<file_path>'
const inputFlagIndex = args.indexOf(inputFlagName)
if (inputFlagIndex === -1 || inputFlagIndex === args.length - 1) exitWithError(
    `Usage: node index.js ${inputFlagName} ${inputFlagPlaceholder}`
)
const providedTwPath = args[inputFlagIndex + 1]

// this function is the only one supposed to be aware of TW file format
const upgradeTwFromSource = (twToUpgradeHtml, newVersionHtml) => {
    // TODO: make sure the bits updated by updateLanguageAttribute are kept as well
    // TODO: reuse code from core (like replaceChunk, or even the whole updateOriginal)
    //  or implement upgrading inside a headless browser (will be slower, but allow not to duplicate core functionality)

    const getStoreAreaBoundaries = (twContent) => {
        const beforeStoreAreaMarker = '<!--POST-SHADOWAREA-->'
        const afterStoreAreaMarker = '<!--POST-STOREAREA-->'
        const beforeStoreAreaMarkerPosition = twContent.indexOf(beforeStoreAreaMarker)
        const afterStoreAreaMarkerPosition = twContent.indexOf(afterStoreAreaMarker)
        if(beforeStoreAreaMarkerPosition == -1 || afterStoreAreaMarkerPosition == -1) return null
        return {
            start: beforeStoreAreaMarkerPosition + beforeStoreAreaMarker.length,
            end: afterStoreAreaMarkerPosition
        }
    }

    const boundariesInLatest = getStoreAreaBoundaries(newVersionHtml)
    const boundariesInCurrent = getStoreAreaBoundaries(twToUpgradeHtml)
    if(!boundariesInLatest || !boundariesInCurrent) exitWithError(
        `Could not find storeArea in the ${!boundariesInLatest ? 'latest TW' : `TW to upgrade (${absoluteTwPath})`}`
    )

    const updateMarkupBlock = (html, htmlWithNewBlock, markerPart) => {
        const blockRe = new RegExp(
            `<!--${markerPart}-START-->(.+?)<!--${markerPart}-END-->`,
            'sm'
        )
        const match = blockRe.exec(htmlWithNewBlock)
        return match ? html.replace(blockRe, match[0]) : html
    }
    // POST-BODY is not used by the core (POST-SCRIPT is), keep for forward compatibility
    const blocksToUpdate = ['PRE-HEAD', 'POST-HEAD', 'PRE-BODY', 'POST-SCRIPT', 'POST-BODY']

    const titleRe = /<title>(.+?)<\/title>/sm
    const title = titleRe.exec(twToUpgradeHtml)[0]

    // extract storeArea from the old TW, insert into the new one; repopulated title, markup blocks
    let upgradedContent =
        newVersionHtml.substring(0, boundariesInLatest.start)
            .replace(titleRe, title)
        + twToUpgradeHtml.substring(boundariesInCurrent.start, boundariesInCurrent.end)
        + newVersionHtml.substring(boundariesInLatest.end)
    for(const blockName of blocksToUpdate) {
        upgradedContent = updateMarkupBlock(upgradedContent, twToUpgradeHtml, blockName)
    }

    return upgradedContent
}

const upgradeTwFile = async (twPath) => {
    // this works with npx (path is resolved against cwd)
    const absoluteTwPath = path.resolve(twPath)
    if(!fs.existsSync(absoluteTwPath)) exitWithError(`File ${absoluteTwPath} does not exist`)
    if(!fs.statSync(absoluteTwPath).isFile()) exitWithError(`${absoluteTwPath} is not a file`)

    const twContent = fs.readFileSync(absoluteTwPath).toString()

    const latestTwRequest = await fetch('https://classic.tiddlywiki.com/upgrade')
    const latestTwResponse = await latestTwRequest.text()

    const upgradedContent = upgradeTwFromSource(twContent, latestTwResponse)

    fs.writeFileSync(absoluteTwPath, upgradedContent)
}

upgradeTwFile(providedTwPath)
