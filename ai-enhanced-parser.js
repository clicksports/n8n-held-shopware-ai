/**
 * AI-Enhanced Product Parser
 * Extracts detailed product attributes for AI-friendly querying
 */

class AIEnhancedProductParser {
  constructor() {
    // Material detection patterns
    this.materialPatterns = {
      'leather': ['leder', 'leather', 'rindleder', 'soft-rindleder'],
      'textile': ['textil', 'textile', 'fabric', 'stoff'],
      'mesh': ['mesh', 'netz'],
      'kevlar': ['kevlar', 'aramid'],
      'cordura': ['cordura'],
      'polyester': ['polyester'],
      'nylon': ['nylon'],
      'cotton': ['baumwolle', 'cotton'],
      'spandex': ['elasthan', 'spandex', 'lycra'],
      'goretex': ['gore-tex', 'goretex'],
      'sympatex': ['sympatex']
    };

    // Feature detection patterns
    this.featurePatterns = {
      protection: [
        'protektoren', 'armor', 'schutz', 'protection', 'sicherheit',
        'ce-protektoren', 'rückenprotektor', 'knieprotektoren'
      ],
      comfort: [
        'komfort', 'comfort', 'ergonomisch', 'ergonomic', 'atmungsaktiv',
        'breathable', 'stretch', 'bewegungsfreiheit', 'mobility'
      ],
      weather: [
        'wasserdicht', 'waterproof', 'winddicht', 'windproof', 'regenfest',
        'weatherproof', 'wetterschutz', 'membrane'
      ],
      ventilation: [
        'belüftung', 'ventilation', 'luftzirkulation', 'air-vent', 'acs',
        'reißverschluss', 'zipper', 'öffnungen', 'vents'
      ],
      storage: [
        'taschen', 'pockets', 'außentaschen', 'innentasche', 'dokumententasche',
        'storage', 'aufbewahrung'
      ],
      adjustability: [
        'verstellbar', 'adjustable', 'weitenregulierung', 'anpassung',
        'elastisch', 'klettverschluss', 'velcro'
      ]
    };

    // Color patterns (German and English)
    this.colorPatterns = {
      'black': ['schwarz', 'black'],
      'white': ['weiß', 'white'],
      'red': ['rot', 'red'],
      'blue': ['blau', 'blue'],
      'green': ['grün', 'green'],
      'yellow': ['gelb', 'yellow'],
      'orange': ['orange'],
      'grey': ['grau', 'grey', 'gray'],
      'brown': ['braun', 'brown'],
      'silver': ['silber', 'silver'],
      'gold': ['gold']
    };

    // Category detection
    this.categoryPatterns = {
      'jacket': ['jacke', 'jacket', 'sportjacke'],
      'pants': ['hose', 'pants', 'trousers'],
      'gloves': ['handschuhe', 'gloves'],
      'boots': ['stiefel', 'boots'],
      'helmet': ['helm', 'helmet'],
      'suit': ['anzug', 'suit', 'kombi']
    };

    // Season detection
    this.seasonPatterns = {
      'summer': ['sommer', 'summer', 'luftig', 'light'],
      'winter': ['winter', 'warm', 'isoliert', 'insulated'],
      'spring': ['frühling', 'spring', 'übergang'],
      'autumn': ['herbst', 'autumn', 'fall'],
      'all-season': ['ganzjährig', 'all-season', 'universal']
    };
  }

  /**
   * Enhanced parsing of product content with AI-friendly structure
   */
  parseEnhancedProduct(content, metadata = {}) {
    const basicInfo = this.extractBasicInfo(content);
    const physicalAttributes = this.extractPhysicalAttributes(content);
    const features = this.extractFeatures(content);
    const technicalSpecs = this.extractTechnicalSpecs(content);
    const usage = this.extractUsage(content);
    const semanticTags = this.generateSemanticTags(content, basicInfo, features);

    return {
      structured_data: {
        basic_info: basicInfo,
        physical_attributes: physicalAttributes,
        features: features,
        technical_specs: technicalSpecs,
        usage: usage
      },
      metadata: {
        ...metadata,
        ai_searchable_tags: semanticTags.searchableTags,
        semantic_keywords: semanticTags.keywords
      }
    };
  }

  /**
   * Extract basic product information
   */
  extractBasicInfo(content) {
    const info = {
      brand: 'Held'
    };

    // Extract name from "Product: NAME" pattern
    const nameMatch = content.match(/Product:\s*([^|]+)/);
    if (nameMatch) {
      info.name = nameMatch[1].trim();
    }

    // Extract article number
    const articleMatch = content.match(/Article:\s*([^|]+)/);
    if (articleMatch) {
      info.article = articleMatch[1].trim();
    }

    // Extract form number
    const formMatch = content.match(/Form:\s*([^|]+)/);
    if (formMatch) {
      info.form = formMatch[1].trim();
    }

    // Extract EAN
    const eanMatch = content.match(/EAN:\s*([^|]+)/);
    if (eanMatch) {
      info.ean = eanMatch[1].trim();
    }

    // Determine category
    const lowerContent = content.toLowerCase();
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      if (patterns.some(pattern => lowerContent.includes(pattern))) {
        info.category = category;
        break;
      }
    }

    // Determine product type from name
    if (info.name) {
      const nameLower = info.name.toLowerCase();
      if (nameLower.includes('top')) info.product_type = 'lightweight_jacket';
      else if (nameLower.includes('sport')) info.product_type = 'sport_jacket';
      else if (nameLower.includes('touring')) info.product_type = 'touring_jacket';
    }

    return info;
  }

  /**
   * Extract physical attributes
   */
  extractPhysicalAttributes(content) {
    const attributes = {
      sizes: [],
      colors: [],
      materials: []
    };

    // Extract size from various patterns
    const sizeMatch = content.match(/Size:\s*([^|]+)/);
    if (sizeMatch) {
      attributes.sizes.push(sizeMatch[1].trim());
    }

    // Extract sizes from article number (e.g., 062424-00/069-0-S)
    const articleSizeMatch = content.match(/\/\d+-\d+-([A-Z\d\s]+)/);
    if (articleSizeMatch) {
      const size = articleSizeMatch[1].trim();
      if (!attributes.sizes.includes(size)) {
        attributes.sizes.push(size);
      }
    }

    // Extract materials
    const lowerContent = content.toLowerCase();
    for (const [material, patterns] of Object.entries(this.materialPatterns)) {
      if (patterns.some(pattern => lowerContent.includes(pattern))) {
        attributes.materials.push({
          name: material,
          type: this.getMaterialType(material)
        });
      }
    }

    // Extract colors from content
    for (const [color, patterns] of Object.entries(this.colorPatterns)) {
      if (patterns.some(pattern => lowerContent.includes(pattern))) {
        if (!attributes.colors.includes(color)) {
          attributes.colors.push(color);
        }
      }
    }

    return attributes;
  }

  /**
   * Extract features categorized by type
   */
  extractFeatures(content) {
    const features = {
      protection: [],
      comfort: [],
      weather: [],
      ventilation: [],
      storage: [],
      adjustability: [],
      certifications: []
    };

    const lowerContent = content.toLowerCase();

    for (const [category, patterns] of Object.entries(this.featurePatterns)) {
      patterns.forEach(pattern => {
        if (lowerContent.includes(pattern)) {
          const feature = this.normalizeFeature(pattern);
          if (!features[category].includes(feature)) {
            features[category].push(feature);
          }
        }
      });
    }

    // Extract specific features from description
    if (lowerContent.includes('außentaschen')) {
      const pocketMatch = content.match(/(\d+)\s*außentaschen/i);
      if (pocketMatch) {
        features.storage.push(`${pocketMatch[1]} outer pockets`);
      }
    }

    if (lowerContent.includes('innentasche')) {
      features.storage.push('inner pocket');
    }

    if (lowerContent.includes('dokumententasche')) {
      features.storage.push('document pocket');
    }

    // Extract certifications
    if (lowerContent.includes('ce')) {
      features.certifications.push('CE certified');
    }

    return features;
  }

  /**
   * Extract technical specifications
   */
  extractTechnicalSpecs(content) {
    const lowerContent = content.toLowerCase();
    
    return {
      waterproof: lowerContent.includes('wasserdicht') || lowerContent.includes('waterproof'),
      windproof: lowerContent.includes('winddicht') || lowerContent.includes('windproof'),
      breathable: lowerContent.includes('atmungsaktiv') || lowerContent.includes('breathable'),
      insulated: lowerContent.includes('isoliert') || lowerContent.includes('insulated'),
      removable_lining: lowerContent.includes('herausnehmbares futter') || lowerContent.includes('removable lining'),
      armor_ready: lowerContent.includes('protektoren') || lowerContent.includes('armor'),
      reflective_elements: lowerContent.includes('reflektierend') || lowerContent.includes('reflective')
    };
  }

  /**
   * Extract usage information
   */
  extractUsage(content) {
    const lowerContent = content.toLowerCase();
    const usage = {
      intended_use: [],
      season: [],
      riding_style: [],
      target_audience: 'motorcyclists'
    };

    // Detect seasons
    for (const [season, patterns] of Object.entries(this.seasonPatterns)) {
      if (patterns.some(pattern => lowerContent.includes(pattern))) {
        usage.season.push(season);
      }
    }

    // Detect riding style from product name/description
    if (lowerContent.includes('sport')) {
      usage.riding_style.push('sport riding');
    }
    if (lowerContent.includes('touring')) {
      usage.riding_style.push('touring');
    }
    if (lowerContent.includes('city') || lowerContent.includes('urban')) {
      usage.riding_style.push('urban commuting');
    }

    // Detect intended use
    if (lowerContent.includes('alternative')) {
      usage.intended_use.push('alternative option');
    }
    if (lowerContent.includes('luftig')) {
      usage.intended_use.push('warm weather riding');
    }

    return usage;
  }

  /**
   * Generate semantic tags and keywords for AI search
   */
  generateSemanticTags(content, basicInfo, features) {
    const tags = new Set();
    const keywords = new Set();

    // Add basic info tags
    if (basicInfo.category) tags.add(basicInfo.category);
    if (basicInfo.product_type) tags.add(basicInfo.product_type);
    if (basicInfo.name) {
      basicInfo.name.split(' ').forEach(word => {
        if (word.length > 2) keywords.add(word.toLowerCase());
      });
    }

    // Add feature tags
    Object.values(features).flat().forEach(feature => {
      tags.add(feature.replace(/\s+/g, '_'));
      feature.split(' ').forEach(word => {
        if (word.length > 2) keywords.add(word.toLowerCase());
      });
    });

    // Add material tags
    const lowerContent = content.toLowerCase();
    Object.keys(this.materialPatterns).forEach(material => {
      if (this.materialPatterns[material].some(pattern => lowerContent.includes(pattern))) {
        tags.add(`material_${material}`);
        keywords.add(material);
      }
    });

    // Add brand tag
    tags.add('brand_held');
    keywords.add('held');

    return {
      searchableTags: Array.from(tags),
      keywords: Array.from(keywords)
    };
  }

  /**
   * Get material type for categorization
   */
  getMaterialType(material) {
    const typeMap = {
      'leather': 'outer',
      'textile': 'outer',
      'mesh': 'lining',
      'kevlar': 'reinforcement',
      'cordura': 'outer',
      'polyester': 'lining',
      'nylon': 'outer',
      'cotton': 'lining',
      'goretex': 'membrane',
      'sympatex': 'membrane'
    };
    return typeMap[material] || 'outer';
  }

  /**
   * Normalize feature names
   */
  normalizeFeature(feature) {
    const normalizeMap = {
      'protektoren': 'armor compatible',
      'atmungsaktiv': 'breathable',
      'wasserdicht': 'waterproof',
      'winddicht': 'windproof',
      'belüftung': 'ventilation',
      'taschen': 'pockets',
      'verstellbar': 'adjustable',
      'außentaschen': 'outer pockets',
      'innentasche': 'inner pocket',
      'dokumententasche': 'document pocket',
      'luftzirkulation': 'air circulation',
      'reißverschluss': 'zipper ventilation'
    };
    return normalizeMap[feature] || feature;
  }
}

module.exports = AIEnhancedProductParser;