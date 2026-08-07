with open('app/page.tsx', 'r') as f:
    content = f.read()

target = "                </div>\n              </div>\n        {\n      </div>\n"
if target in content:
    content = content.replace(target, "                </div>\n              </div>\n")
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print("Exact replacement SUCCESS!")
else:
    print("Target string not found!")

