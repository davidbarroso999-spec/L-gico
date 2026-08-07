with open('app/page.tsx', 'r') as f:
    content = f.read()

bad_str = "              </div>        {\n      </div>"
if bad_str in content:
    content = content.replace(bad_str, "              </div>")
    print("Replaced bad_str!")

bad_str2 = "              </div>        {\n      </div>        {!hasTwoOrMoreAddresses"
if bad_str2 in content:
    content = content.replace(bad_str2, "              </div>        {!hasTwoOrMoreAddresses")
    print("Replaced bad_str2!")

with open('app/page.tsx', 'w') as f:
    f.write(content)

