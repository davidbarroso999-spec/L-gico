with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

# Before pos_loading, there should be 4 closing divs before </motion.div>
# Let's check the end of home screen right before pos_loading
end_home = content[pos_loading - 100 : pos_loading]
print("End of home currently:")
print(repr(end_home))

