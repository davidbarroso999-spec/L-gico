with open('app/page.tsx', 'r') as f:
    content = f.read()

pos = content.find("isLoading={false}\n                        />\n                      </div>\n                    )}")

if pos != -1:
    old_end = content[pos:]
    new_end = """isLoading={false}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
"""
    content = content[:pos] + new_end
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print("Settings end fixed!")
else:
    print("Pos not found, trying without exact whitespace...")
    pos2 = content.find("isLoading={false}")
    pos_end_sidebar_div = content.find("</div>", pos2)
    pos_end_ternary = content.find(")}", pos_end_sidebar_div)
    
    prefix = content[:pos_end_ternary + 2]
    new_end = """
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
"""
    with open('app/page.tsx', 'w') as f:
        f.write(prefix + new_end)
    print("Settings end fixed (variant 2)!")

