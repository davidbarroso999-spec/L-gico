with open('components/MapView.tsx', 'r') as f:
    content = f.read()

# Target states
states_str = "  const [showTrafficLayer, setShowTrafficLayer] = useState(false);\n  const [showWeatherLayer, setShowWeatherLayer] = useState(false);"

# Remove states_str from line 746
content = content.replace(states_str, "")

# Insert states_str before line 523 useEffect
target_useeffect = "  useEffect(() => {\n    if (mapStyleProp) setTileStyle(mapStyleProp);"
replacement = states_str + "\n\n  useEffect(() => {\n    if (mapStyleProp) setTileStyle(mapStyleProp);"

content = content.replace(target_useeffect, replacement)

with open('components/MapView.tsx', 'w') as f:
    f.write(content)

print("MapView lint fixed!")

