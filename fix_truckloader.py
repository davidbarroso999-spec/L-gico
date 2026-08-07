with open('app/page.tsx', 'r') as f:
    content = f.read()

bad = "<TruckLoader />            <          {currentScreen === 'result'"
good = "<TruckLoader />\n            </motion.div>\n          )}\n\n          {currentScreen === 'result'"

if bad in content:
    content = content.replace(bad, good)
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print("Fixed TruckLoader closing tag!")

