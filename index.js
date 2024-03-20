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

const upgradeTw = async (twPath) => {
    const absoluteTwPath = path.resolve(twPath)

    const twContent = fs.readFileSync(absoluteTwPath).toString()

    const latestTwRequest = await fetch('https://classic.tiddlywiki.com/upgrade')
    const latestTwResponse = await latestTwRequest.text()

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

    const boundariesInLatest = getStoreAreaBoundaries(latestTwResponse)
    const boundariesInCurrent = getStoreAreaBoundaries(twContent)
    if(!boundariesInLatest || !boundariesInCurrent) exitWithError(
        `Could not find storeArea in the ${!boundariesInLatest ? 'latest TW' : `TW to upgrade (${absoluteTwPath})`}`
    )

    const upgradedContent =
        latestTwResponse.substring(0, boundariesInLatest.start)
        + twContent.substring(boundariesInCurrent.start, boundariesInCurrent.end)
        + latestTwResponse.substring(boundariesInLatest.end)

    fs.writeFileSync(absoluteTwPath, upgradedContent)
}

upgradeTw(providedTwPath)
