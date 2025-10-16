import { extractColors } from 'extract-colors'
import { sessionCache, SongIdentifier } from './sessionCache'

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  textSecondary: string
}

export interface RGBColor {
  r: number
  g: number
  b: number
}

export interface HSLColor {
  h: number
  s: number
  l: number
}

export interface ExtractedColor {
  hex: string
  red: number
  green: number
  blue: number
  hue: number
  intensity: number
  lightness: number
  saturation: number
  area: number
}

class ColorExtractor {
  constructor() {}

  /**
   * Enhance a color by boosting its saturation and vibrancy based on its current levels
   */
  private enhanceColor(color: ExtractedColor): ExtractedColor {
    const hsl = this.rgbToHsl(color.red, color.green, color.blue)

    const currentSaturation = color.saturation
    const currentLightness = color.lightness
    const currentIntensity = color.intensity

    let saturationBoost = 1
    let lightnessAdjust = 1
    let intensityBoost = 1

    if (currentSaturation < 0.3) {
      saturationBoost = 2.5
    } else if (currentSaturation < 0.6) {
      saturationBoost = 1.8
    } else if (currentSaturation < 0.8) {
      saturationBoost = 1.4
    } else {
      saturationBoost = 1.2
    }

    if (currentLightness < 0.2) {
      lightnessAdjust = 1.5
    } else if (currentLightness < 0.4) {
      lightnessAdjust = 1.2
    } else if (currentLightness > 0.8) {
      lightnessAdjust = 0.8
    }

    if (currentIntensity < 0.4) {
      intensityBoost = 1.6
    } else if (currentIntensity < 0.7) {
      intensityBoost = 1.3
    } else {
      intensityBoost = 1.1
    }

    const enhancedHsl = {
      h: hsl.h,
      s: Math.min(100, hsl.s * saturationBoost),
      l: Math.min(90, Math.max(10, hsl.l * lightnessAdjust)),
    }

    const enhancedRgb = this.hslToRgb(enhancedHsl.h, enhancedHsl.s, enhancedHsl.l)

    const enhancedColor: ExtractedColor = {
      ...color,
      red: enhancedRgb.r,
      green: enhancedRgb.g,
      blue: enhancedRgb.b,
      hex: `#${enhancedRgb.r.toString(16).padStart(2, '0')}${enhancedRgb.g.toString(16).padStart(2, '0')}${enhancedRgb.b.toString(16).padStart(2, '0')}`,
      saturation: enhancedHsl.s / 100,
      lightness: enhancedHsl.l / 100,
      intensity: Math.min(1, color.intensity * intensityBoost),
    }

    console.warn('Color enhancement:', {
      original: { hex: color.hex, sat: color.saturation.toFixed(2), light: color.lightness.toFixed(2) },
      enhanced: {
        hex: enhancedColor.hex,
        sat: enhancedColor.saturation.toFixed(2),
        light: enhancedColor.lightness.toFixed(2),
      },
      boosts: {
        saturation: saturationBoost.toFixed(1),
        lightness: lightnessAdjust.toFixed(1),
        intensity: intensityBoost.toFixed(1),
      },
    })

    return enhancedColor
  }

  /**
   * Find the best color based on saturation and area balance
   * Prioritizes colors that are both saturated and have good presence in the image
   */
  private findBestColor(colors: ExtractedColor[]): ExtractedColor | null {
    if (colors.length === 0) return null

    const filteredColors = colors.filter(
      (color) => color.lightness > 0.08 && color.lightness < 0.92 && color.saturation > 0.2
    )

    if (filteredColors.length === 0) {
      return colors[0]
    }

    const scoredColors = filteredColors.map((color) => {
      const saturationScore = Math.pow(color.saturation, 0.8)

      const areaScore =
        color.area < 0.01
          ? color.area * 50
          : color.area > 0.7
            ? Math.max(0.2, 1 - (color.area - 0.7) * 2)
            : Math.min(1.5, color.area * 4)

      const intensityScore = Math.pow(color.intensity, 0.9)

      const lightnessScore =
        color.lightness < 0.15 ? color.lightness * 3 : color.lightness > 0.85 ? (1 - color.lightness) * 3 : 1

      const totalScore = areaScore * 0.45 + saturationScore * 0.25 + intensityScore * 0.2 + lightnessScore * 0.1

      return { color, score: totalScore }
    })

    scoredColors.sort((a, b) => b.score - a.score)
    return scoredColors[0].color
  }

  /**
   * Convert RGB to HSL (simplified version)
   */
  private rgbToHsl(r: number, g: number, b: number): HSLColor {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h: number, s: number
    const l = (max + min) / 2

    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
        default:
          h = 0
      }
      h /= 6
    }

    return { h: h * 360, s: s * 100, l: l * 100 }
  }

  /**
   * Convert HSL to RGB
   */
  private hslToRgb(h: number, s: number, l: number): RGBColor {
    h /= 360
    s /= 100
    l /= 100

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    let r: number, g: number, b: number

    if (s === 0) {
      r = g = b = l
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
  }

  /**
   * Generate a color palette based on extract-colors results
   */
  private generatePalette(extractedColors: ExtractedColor[]): ColorPalette {
    if (extractedColors.length === 0) {
      return this.getDefaultPalette()
    }

    const rawBestColor = this.findBestColor(extractedColors)
    if (!rawBestColor) {
      return this.getDefaultPalette()
    }

    const bestColor = this.enhanceColor(rawBestColor)

    console.warn('Selected and enhanced best color:', {
      original: rawBestColor.hex,
      enhanced: bestColor.hex,
      saturation: bestColor.saturation.toFixed(2),
      area: bestColor.area.toFixed(4),
      lightness: bestColor.lightness.toFixed(2),
    })

    const backgroundHsl = this.rgbToHsl(bestColor.red, bestColor.green, bestColor.blue)
    const backgroundHsl2 = {
      ...backgroundHsl,
      l: Math.max(backgroundHsl.l * 0.35, 18),
      s: Math.max(backgroundHsl.s * 0.95, 60),
    }
    const backgroundRgb = this.hslToRgb(backgroundHsl2.h, backgroundHsl2.s, backgroundHsl2.l)

    const primaryHsl = {
      ...backgroundHsl,
      l: Math.max(backgroundHsl.l * 0.4, 20),
      s: Math.max(backgroundHsl.s * 0.9, 50),
    }
    const primaryRgb = this.hslToRgb(primaryHsl.h, primaryHsl.s, primaryHsl.l)

    const secondaryHsl = {
      ...backgroundHsl,
      l: Math.max(backgroundHsl.l * 0.6, 30),
      s: Math.max(backgroundHsl.s * 0.8, 45),
    }
    const secondaryRgb = this.hslToRgb(secondaryHsl.h, secondaryHsl.s, secondaryHsl.l)

    const textColor = { r: 255, g: 255, b: 255 }
    const textSecondaryColor = { r: 180, g: 180, b: 180 }

    const finalBackgroundHsl = this.rgbToHsl(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b)
    if (finalBackgroundHsl.s < 50) {
      console.warn('Background still too muted, applying final boost')
      const boostedBackgroundHsl = {
        ...finalBackgroundHsl,
        s: Math.min(75, finalBackgroundHsl.s * 1.5),
        l: Math.min(25, finalBackgroundHsl.l * 1.1),
      }
      const boostedBackgroundRgb = this.hslToRgb(boostedBackgroundHsl.h, boostedBackgroundHsl.s, boostedBackgroundHsl.l)

      console.warn('Final color boost:', {
        original: `hsl(${finalBackgroundHsl.h.toFixed(0)}, ${finalBackgroundHsl.s.toFixed(0)}%, ${finalBackgroundHsl.l.toFixed(0)}%)`,
        boosted: `hsl(${boostedBackgroundHsl.h.toFixed(0)}, ${boostedBackgroundHsl.s.toFixed(0)}%, ${boostedBackgroundHsl.l.toFixed(0)}%)`,
      })

      return {
        primary: `rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`,
        secondary: `rgb(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b})`,
        accent: bestColor.hex,
        background: `rgb(${boostedBackgroundRgb.r}, ${boostedBackgroundRgb.g}, ${boostedBackgroundRgb.b})`,
        text: `rgb(${textColor.r}, ${textColor.g}, ${textColor.b})`,
        textSecondary: `rgb(${textSecondaryColor.r}, ${textSecondaryColor.g}, ${textSecondaryColor.b})`,
      }
    }

    return {
      primary: `rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`,
      secondary: `rgb(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b})`,
      accent: bestColor.hex,
      background: `rgb(${backgroundRgb.r}, ${backgroundRgb.g}, ${backgroundRgb.b})`,
      text: `rgb(${textColor.r}, ${textColor.g}, ${textColor.b})`,
      textSecondary: `rgb(${textSecondaryColor.r}, ${textSecondaryColor.g}, ${textSecondaryColor.b})`,
    }
  }

  /**
   * Extract colors from image URL using extract-colors library
   */
  async extractColorsFromImage(imageUrl: string, songInfo: SongIdentifier): Promise<ColorPalette> {
    const cachedData = sessionCache.getCachedData(songInfo)
    if (cachedData && cachedData.colorPalette) {
      return cachedData.colorPalette
    }

    try {
      console.warn('Extracting colors from image:', imageUrl)

      const options = {
        pixels: 80000,
        distance: 0.15,
        saturationDistance: 0.1,
        lightnessDistance: 0.1,
        hueDistance: 0.05,
        crossOrigin: 'anonymous' as const,
        colorValidator: (red: number, green: number, blue: number, alpha: number = 255) => {
          const brightness = (red + green + blue) / 3
          const saturation = Math.max(red, green, blue) - Math.min(red, green, blue)

          return alpha > 180 && brightness > 10 && brightness < 245 && saturation > 15
        },
      }

      const colors: ExtractedColor[] = (await extractColors(imageUrl, options)) as ExtractedColor[]

      console.warn('Extracted colors:', colors.length)

      if (colors.length > 0) {
        colors.slice(0, 5).forEach((color, index) => {
          console.warn(`Color ${index + 1}:`, {
            hex: color.hex,
            saturation: color.saturation.toFixed(2),
            area: color.area.toFixed(4),
            lightness: color.lightness.toFixed(2),
            intensity: color.intensity.toFixed(2),
          })
        })

        const mostSaturated = colors.reduce((prev, curr) => (curr.saturation > prev.saturation ? curr : prev))
        console.warn('Most saturated color:', {
          hex: mostSaturated.hex,
          saturation: mostSaturated.saturation.toFixed(2),
          area: mostSaturated.area.toFixed(4),
        })
      }

      const palette = this.generatePalette(colors)
      sessionCache.updateColorPalette(songInfo, palette)
      return palette
    } catch (error) {
      console.error('Error extracting colors from image:', error)
      return this.getDefaultPalette()
    }
  }

  /**
   * Get a default dark palette for music apps
   */
  getDefaultPalette(): ColorPalette {
    return {
      primary: '#1f1f1f',
      secondary: '#2d2d2d',
      accent: '#1db954',
      background: '#0f0f0f',
      text: '#ffffff',
      textSecondary: '#b3b3b3',
    }
  }
}

export const colorExtractor = new ColorExtractor()
export default ColorExtractor
