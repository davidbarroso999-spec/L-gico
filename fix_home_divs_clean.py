with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_loading = content.find("{currentScreen === 'loading' && (")

# Find </motion.div>          </>        )} before pos_loading
pos_btn_end = content.rfind("</motion.div>          </>        )}", 0, pos_loading)

if pos_btn_end != -1:
    old_tail = content[pos_btn_end : pos_loading]
    new_tail = """</motion.div>
          </>
        )}
      </div>
    </div>
  </motion.div>
)}

          """
    content = content[:pos_btn_end] + new_tail + content[pos_loading:]
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print("Cleaned home end divs!")

