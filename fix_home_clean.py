with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

pos_saved_start = content.find('{/* Bento Box 6: Saved & Shared Routes List */}', pos_home)
if pos_saved_start == -1:
    pos_saved_start = content.find('Rotas Salvas e Agendadas', pos_home)
    pos_saved_start = content.rfind('<div className="glass', 0, pos_saved_start)

pos_calc = content.find('{!hasTwoOrMoreAddresses ?', pos_saved_start)

# Get home inputs up to pos_saved_start
home_inputs = content[pos_home : pos_saved_start].strip()

# Clean home_inputs trailing divs if any extra
# Extract saved routes card cleanly from pos_saved_start to pos_calc
saved_routes_content = content[pos_saved_start : pos_calc].strip()

# Clean ending of saved_routes_content so it has exactly 1 closing </div> for the card
while saved_routes_content.endswith('</div>'):
    # Check count of divs
    o = saved_routes_content.count('<div') + saved_routes_content.count('<motion.div')
    c = saved_routes_content.count('</div>') + saved_routes_content.count('</motion.div>')
    if c > o:
        saved_routes_content = saved_routes_content[:-6].strip()
    else:
        break

# Calc block
calc_content = content[pos_calc : pos_loading].strip()
# Clean calc_content ending so it closes <motion.div> cleanly
while calc_content.endswith('</div>') or calc_content.endswith('</motion.div>'):
    o = calc_content.count('<div') + calc_content.count('<motion.div')
    c = calc_content.count('</div>') + calc_content.count('</motion.div>')
    if c > o:
        if calc_content.endswith('</motion.div>'):
            calc_content = calc_content[:-13].strip()
        elif calc_content.endswith('</div>'):
            calc_content = calc_content[:-6].strip()
    else:
        break

# Construct clean home block
clean_home_block = f"""{home_inputs}
        {saved_routes_content}
        {calc_content}
      </div>
    </motion.div>
  )}}"""

new_content = content[:pos_home] + clean_home_block + '\n          ' + content[pos_loading:]

with open('app/page.tsx', 'w') as f:
    f.write(new_content)

print("Home block cleaned!")

