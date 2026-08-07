with open('app/page.tsx', 'r') as f:
    content = f.read()

bad = "</button>\n              </div>\n            </motion.div>\n          </>\n        )}\n      </div>\n    </motion.div>\n  )}\n          "
good = "</button>\n              </div>\n            </motion.div>\n          </>\n        )}\n      </div>\n    </div>\n  </motion.div>\n)}\n          "

content = content.replace(bad, good)

with open('app/page.tsx', 'w') as f:
    f.write(content)

print("Replaced home tail exact!")

