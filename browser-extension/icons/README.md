# Icon Generation

The extension needs PNG icons at these sizes:
- icon16.png (16x16)
- icon32.png (32x32)  
- icon48.png (48x48)
- icon128.png (128x128)

## Convert from SVG

Use any of these methods:

### Option 1: Online Converter
1. Go to https://convertio.co/svg-png/
2. Upload icon.svg
3. Download PNG, then resize to each size needed

### Option 2: Using ImageMagick (command line)
```bash
# Install ImageMagick if needed
brew install imagemagick

# Convert SVG to PNGs
convert -background none -resize 16x16 icon.svg icon16.png
convert -background none -resize 32x32 icon.svg icon32.png
convert -background none -resize 48x48 icon.svg icon48.png
convert -background none -resize 128x128 icon.svg icon128.png
```

### Option 3: Using Figma
1. Create new file
2. Import icon.svg
3. Export at 1x, 2x, 3x, 8x scales

## For Chrome Web Store

Also need:
- 1280x800 screenshot
- 440x280 promotional tile

These should show the extension popup and Visual Editor in action.
