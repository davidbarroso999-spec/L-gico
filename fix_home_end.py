with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_calc = content.find('{!hasTwoOrMoreAddresses ?')
pos_loading = content.find("{currentScreen === 'loading' && (")

# Find where {!hasTwoOrMoreAddresses ends
# It ends after </motion.div>                    </>                  )}

calc_block = content[pos_calc:pos_loading]

pos_end_btn = calc_block.find('</motion.div>')
pos_end_btn = calc_block.find('</motion.div>', pos_end_btn + 1) # inner button motion.div
pos_end_frag = calc_block.find('</>', pos_end_btn)
pos_end_paren = calc_block.find(')}', pos_end_frag)

clean_calc = calc_block[:pos_end_paren + 2]

new_home_end = clean_calc + """
      </div>
    </motion.div>
  )}"""

new_content = content[:pos_calc] + new_home_end + '\n          ' + content[pos_loading:]

with open('app/page.tsx', 'w') as f:
    f.write(new_content)

print("Home end cleaned!")

