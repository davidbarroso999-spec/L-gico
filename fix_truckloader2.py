with open('app/page.tsx', 'r') as f:
    content = f.read()

bad = "<TruckLoader />\n            <\n          {currentScreen === 'result'"
good = "<TruckLoader />\n            </motion.div>\n          )}\n\n          {currentScreen === 'result'"

content = content.replace(bad, good)
with open('app/page.tsx', 'w') as f:
    f.write(content)
print("Replaced TruckLoader closing tag!")

