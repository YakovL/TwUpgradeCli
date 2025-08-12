/**
 * TiddlyWiki Classic Parser Module
 * 
 * Node.js adaptation of TW21Loader functionality for extracting tiddlers
 * from TiddlyWiki Classic HTML files.
 * 
 * TODO: make the core code reusable to avoid such duplication
 */

const { JSDOM } = require('jsdom')

// Helper functions for tiddler extraction (Node.js adaptations of TW21Loader)
const getNodeText = (node) => {
    return node.textContent || node.innerText || ''
}

const htmlDecode = (str) => {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
}

const unescapeLineBreaks = (str) => {
    return str.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
}

const convertFromYYYYMMDDHHMMSS = (dateStr) => {
    if (!dateStr || dateStr.length !== 12) return new Date()
    const year = parseInt(dateStr.substr(0, 4))
    const month = parseInt(dateStr.substr(4, 2)) - 1 // Month is 0-based
    const day = parseInt(dateStr.substr(6, 2))
    const hour = parseInt(dateStr.substr(8, 2))
    const minute = parseInt(dateStr.substr(10, 2))
    return new Date(year, month, day, hour, minute)
}

const isStandardField = (fieldName) => {
    const standardFields = ['title', 'text', 'modifier', 'modified', 'creator', 'created', 'tags']
    return standardFields.includes(fieldName)
}

const extractTiddlerFromNode = (node, title) => {
    let text = null
    let e = node.firstChild

    if(node.getAttribute && node.getAttribute('tiddler')) {
        text = unescapeLineBreaks(getNodeText(e))
    } else {
        while(e && e.nodeName !== 'PRE' && e.nodeName !== 'pre') {
            e = e.nextSibling
        }
        if(e) {
            text = htmlDecode(e.innerHTML.replace(/\r/mg, ''))
        }
    }

    const creator = node.getAttribute('creator') || ''
    const modifier = node.getAttribute('modifier') || ''
    const createdStr = node.getAttribute('created')
    const modifiedStr = node.getAttribute('modified')
    const created = createdStr ? convertFromYYYYMMDDHHMMSS(createdStr) : new Date()
    const modified = modifiedStr ? convertFromYYYYMMDDHHMMSS(modifiedStr) : created
    const tagsString = node.getAttribute('tags') || ''

    // Extract custom fields
    const fields = {}
    if(node.attributes) {
        for(let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i]
            if(attr.specified && !isStandardField(attr.name)) {
                fields[attr.name] = unescapeLineBreaks(attr.value)
            }
        }
    }

    return {
        title,
        text: text || '',
        creator,
        modifier,
        created,
        modified,
        tagsString,
        fields
    }
}

/**
 * Extracts all tiddlers from TiddlyWiki Classic HTML content
 * @param {string} htmlContent - The HTML content of the TiddlyWiki file
 * @returns {Array} Array of tiddler objects
 */
const extractTiddlersFromHtml = (htmlContent) => {
    const dom = new JSDOM(htmlContent)
    const document = dom.window.document
    const tiddlers = []

    // Find the storeArea element first
    const storeArea = document.getElementById('storeArea')
    if(!storeArea) {
        return {
            warning: '#storeArea not found in the TiddlyWiki file',
            tiddlers,
        }
    }

    // Find all DIV elements with title attribute that are direct children of #storeArea
    const tiddlerNodes = storeArea.querySelectorAll(':scope > div[title]')

    tiddlerNodes.forEach(node => {
        let title = node.getAttribute('title')

        // If no title attribute, try to get from id (with store prefix)
        if(!title && node.id) {
            const storePrefix = 'store'  // Default TiddlyWiki store prefix
            if(node.id.startsWith(storePrefix)) {
                title = node.id.substring(storePrefix.length)
            }
        }

        if(title) {
            try {
                const tiddler = extractTiddlerFromNode(node, title)
                tiddlers.push(tiddler)
            } catch(error) {
                // Store extraction errors for caller to handle
                tiddlers.push({ error: `Failed to extract tiddler "${title}": ${error.message}`, title })
            }
        }
    })

    return { tiddlers }
}

module.exports = {
    extractTiddlersFromHtml,
}
