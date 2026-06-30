/**
 * @typedef {Object} SiteConfig
 * @property {{name: string, subtitle: string, email: string, url?: string}} brand
 * @property {{name: string, intro: string, avatar?: string}} author
 * @property {string} featuredWorkSlug
 * @property {"createdAt"|"date"} updatesSortMode
 * @property {Array<{label: string, value: string}>} stats
 * @property {Array<{id: string, label: string, url: string, enabled: boolean}>} [socialLinks]
 * @property {{novel: Array<{id: string, label: string}>, comic: Array<{id: string, label: string}>}} [workCategories]
 */

/**
 * @typedef {Object} Work
 * @property {string} slug
 * @property {"小说"|"漫画"} type
 * @property {string} title
 * @property {string} subtitle
 * @property {string} description
 * @property {string} cover
 * @property {string[]} genre
 * @property {string} [workCategory]
 * @property {string} status
 * @property {string} progress
 * @property {string} date
 * @property {string} [createdAt]
 * @property {number} order
 * @property {boolean} hidden
 * @property {{enableVolumes: boolean, enableSections: boolean, volumeLabel: string, chapterLabel: string, sectionLabel: string}} [chapterStructure]
 * @property {Array<{id: string, title: string, subtitle?: string, summary?: string, order: number, status: "visible"|"hidden", collapsed?: boolean}>} [volumes]
 */

/**
 * @typedef {Object} MarkdownContent
 * @property {"chapter"|"character"|"note"} kind
 * @property {string} slug
 * @property {string} title
 * @property {string} summary
 * @property {string} date
 * @property {string} [createdAt]
 * @property {"draft"|"published"} status
 * @property {number} order
 * @property {string} body
 * @property {string} [work]
 * @property {string} [volume]
 * @property {Array<{id: string, title: string, order: number, body: string, anchor: string}>} [sections]
 * @property {string} [cover]
 * @property {string} [role]
 * @property {string} [affiliation]
 * @property {string} [profileStatus]
 * @property {string[]} [aliases]
 * @property {string[]} [traits]
 * @property {Array<{name: string, description: string, image?: string}>} [abilities]
 * @property {Array<{label: string, description: string}>} [timeline]
 * @property {Array<{characterSlug: string, label: string, description: string}>} [relationships]
 * @property {Array<{label: string, image: string}>} [gallery]
 * @property {string} [path]
 */

/**
 * @typedef {Object} Illustration
 * @property {string} slug
 * @property {string} title
 * @property {string} summary
 * @property {string} image
 * @property {string} category
 * @property {string} series
 * @property {string} date
 * @property {number} order
 * @property {"draft"|"published"} status
 * @property {boolean} featured
 * @property {string} [path]
 */

/**
 * @typedef {Object} ContentRepository
 * @property {SiteConfig} site
 * @property {Work[]} works
 * @property {MarkdownContent[]} chapters
 * @property {MarkdownContent[]} characters
 * @property {MarkdownContent[]} notes
 * @property {Illustration[]} illustrations
 */

export {};
