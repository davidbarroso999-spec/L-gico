with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_p1 = content.find('{/* Bento Box 1: Vehicle selection */}')
pos_p2 = content.find('{settingsTab === \'preferences\' ?')
pos_p3 = content.find(') : (', pos_p1)

prefs = content[pos_p1:pos_p3]

o = prefs.count('<div') + prefs.count('<motion.div')
c = prefs.count('</div>') + prefs.count('</motion.div>')

print("Prefs opens:", o, "Closes:", c)

