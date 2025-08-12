/**
 * TiddlyWiki .tid File Formatter Module
 * 
 * Formats tiddler objects into the .tid file format used by TiddlyWiki Classic.
 * The .tid format consists of header fields followed by an empty line and then the content.
 */

/**
 * Formats a Date object into TiddlyWiki's YYYYMMDDHHMM format
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string
 */
const formatTiddlyWikiDate = (date) => {
    if (!date || !(date instanceof Date)) return ''

    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    const second = date.getSeconds().toString().padStart(2, '0')
    const millisecond = date.getMilliseconds().toString().padStart(3, '0')

    return `${year}${month}${day}${hour}${minute}${second}${millisecond}`
}

/**
 * Subsitutes line breaks (\n, \r) with escaped versions (\\n, \\r)
 * @param {string} value - The value to escape
 * @returns {string} The escaped value
 */
const escapeLineBreaks = (value) => {
    if (typeof value !== 'string') return value
    return value.replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

/**
 * Formats a tiddler-like object into .tid file format (see extractTiddlerFromNode)
 * @param {Object} tiddler - The tiddler-like object to format:
 * ```
 * {
 *     title: string,
 *     text: string,
 *     creator: string,
 *     modifier: string,
 *     created: Date,
 *     modified: Date,
 *     tagsString: string, // non-parsed
 *     fields: Object,
 * }
 * ```
 * @returns {string} The formatted .tid file content
 */
const formatTiddlerAsTid = (tiddler) => {
    const lines = []

    const standardFields = [
        { name: 'created', formatter: formatTiddlyWikiDate },
        { name: 'creator', formatter: escapeLineBreaks },
        { name: 'modified', formatter: formatTiddlyWikiDate },
        { name: 'modifier', formatter: escapeLineBreaks },
    ]

    standardFields.forEach(({ name, formatter }) => {
        const value = tiddler[name]
        if(value) {
            lines.push(`${name}: ${formatter(value)}`)
        }
    })

    if(tiddler.tagsString) lines.push(`tags: ${escapeLineBreaks(tiddler.tagsString)}`)
    lines.push(`title: ${tiddler.title}`)

    lines.push('')
    lines.push(tiddler.text || '')

    return lines.join('\n')
}

/**
 * URL encode the title to handle special characters safely
 * @param {string} title - The tiddler title
 * @returns {string} A safe filename with .tid extension
 */
const generateTidFilename = (title) => encodeURIComponent(title) + '.tid'

module.exports = {
    formatTiddlerAsTid,
    generateTidFilename,
}
