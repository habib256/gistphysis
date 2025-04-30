#!/bin/bash

# Chemin vers l'image source (doit être carrée, idéalement 1024x1024)
SOURCE_ICON="resources/icon.png"
# Dossier de destination
DEST="ios/App/App/Assets.xcassets/AppIcon.appiconset"

# Tableau des tailles requises (nom, taille, idiom, scale)
declare -a icons=(
  "Icon-App-20x20@1x.png 20 iphone 1x"
  "Icon-App-20x20@2x.png 40 iphone 2x"
  "Icon-App-20x20@3x.png 60 iphone 3x"
  "Icon-App-29x29@1x.png 29 iphone 1x"
  "Icon-App-29x29@2x.png 58 iphone 2x"
  "Icon-App-29x29@3x.png 87 iphone 3x"
  "Icon-App-40x40@1x.png 40 iphone 1x"
  "Icon-App-40x40@2x.png 80 iphone 2x"
  "Icon-App-40x40@3x.png 120 iphone 3x"
  "Icon-App-60x60@2x.png 120 iphone 2x"
  "Icon-App-60x60@3x.png 180 iphone 3x"
  "Icon-App-76x76@1x.png 76 ipad 1x"
  "Icon-App-76x76@2x.png 152 ipad 2x"
  "Icon-App-83.5x83.5@2x.png 167 ipad 2x"
  "Icon-App-1024x1024@1x.png 1024 ios-marketing 1x"
)

mkdir -p "$DEST"

# Génération des icônes
for icon in "${icons[@]}"; do
  set -- $icon
  name=$1
  size=$2
  magick "$SOURCE_ICON" -resize ${size}x${size} "$DEST/$name"
done

echo "✅ Icônes iOS générées dans $DEST"

# Génération du fichier Contents.json
cat > "$DEST/Contents.json" <<EOL
{
  "images" : [
    { "idiom" : "iphone", "size" : "20x20", "scale" : "1x", "filename" : "Icon-App-20x20@1x.png" },
    { "idiom" : "iphone", "size" : "20x20", "scale" : "2x", "filename" : "Icon-App-20x20@2x.png" },
    { "idiom" : "iphone", "size" : "20x20", "scale" : "3x", "filename" : "Icon-App-20x20@3x.png" },
    { "idiom" : "iphone", "size" : "29x29", "scale" : "1x", "filename" : "Icon-App-29x29@1x.png" },
    { "idiom" : "iphone", "size" : "29x29", "scale" : "2x", "filename" : "Icon-App-29x29@2x.png" },
    { "idiom" : "iphone", "size" : "29x29", "scale" : "3x", "filename" : "Icon-App-29x29@3x.png" },
    { "idiom" : "iphone", "size" : "40x40", "scale" : "1x", "filename" : "Icon-App-40x40@1x.png" },
    { "idiom" : "iphone", "size" : "40x40", "scale" : "2x", "filename" : "Icon-App-40x40@2x.png" },
    { "idiom" : "iphone", "size" : "40x40", "scale" : "3x", "filename" : "Icon-App-40x40@3x.png" },
    { "idiom" : "iphone", "size" : "60x60", "scale" : "2x", "filename" : "Icon-App-60x60@2x.png" },
    { "idiom" : "iphone", "size" : "60x60", "scale" : "3x", "filename" : "Icon-App-60x60@3x.png" },
    { "idiom" : "ipad", "size" : "76x76", "scale" : "1x", "filename" : "Icon-App-76x76@1x.png" },
    { "idiom" : "ipad", "size" : "76x76", "scale" : "2x", "filename" : "Icon-App-76x76@2x.png" },
    { "idiom" : "ipad", "size" : "83.5x83.5", "scale" : "2x", "filename" : "Icon-App-83.5x83.5@2x.png" },
    { "idiom" : "ios-marketing", "size" : "1024x1024", "scale" : "1x", "filename" : "Icon-App-1024x1024@1x.png" }
  ],
  "info" : { "version" : 1, "author" : "xcode" }
}
EOL

echo "✅ Contents.json généré dans $DEST" 