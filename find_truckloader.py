with open('app/page.tsx', 'r') as f:
    content = f.read()

pos = content.find('<TruckLoader />')
print(repr(content[pos-50:pos+100]))

