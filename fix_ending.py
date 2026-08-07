with open('app/page.tsx', 'r') as f:
    content = f.read()

pos = content.find("</motion.div>\n          )}")
if pos == -1:
    pos = content.find("</motion.div>          )}")

if pos != -1:
    clean_ending = content[:pos + len("</motion.div>\n          )")] + """
        </AnimatePresence>
      </main>
    </div>
  );
}
"""
    with open('app/page.tsx', 'w') as f:
        f.write(clean_ending)
    print("Ending cleaned!")
else:
    print("Pos not found!")

