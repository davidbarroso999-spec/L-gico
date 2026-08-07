# Fix MapView.tsx
with open('components/MapView.tsx', 'r') as f:
    mv = f.read()

mv = mv.replace(
    "if (mapStyleProp) setTileStyle(mapStyleProp);",
    "if (mapStyleProp) queueMicrotask(() => setTileStyle(mapStyleProp));"
)
mv = mv.replace(
    "if (showTrafficProp !== undefined) setShowTrafficLayer(showTrafficProp);",
    "if (showTrafficProp !== undefined) queueMicrotask(() => setShowTrafficLayer(showTrafficProp));"
)
mv = mv.replace(
    "if (showWeatherProp !== undefined) setShowWeatherLayer(showWeatherProp);",
    "if (showWeatherProp !== undefined) queueMicrotask(() => setShowWeatherLayer(showWeatherProp));"
)

with open('components/MapView.tsx', 'w') as f:
    f.write(mv)

# Fix app/page.tsx
with open('app/page.tsx', 'r') as f:
    page = f.read()

page = page.replace(
    "if (addressIds.length !== addresses.length) {\n      setAddressIds(prev => {",
    "if (addressIds.length !== addresses.length) {\n      queueMicrotask(() => setAddressIds(prev => {"
)
page = page.replace(
    "return prev.slice(0, addresses.length);\n      });\n    }\n  }, [addresses.length, addressIds.length]);",
    "return prev.slice(0, addresses.length);\n      }));\n    }\n  }, [addresses.length, addressIds.length]);"
)

with open('app/page.tsx', 'w') as f:
    f.write(page)

print("Applied queueMicrotask lint fixes!")

