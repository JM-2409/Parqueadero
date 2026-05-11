#!/bin/bash

# Find all tsx files in the app directories
find app/employee app/admin app/superadmin app/setup app/setup-owner -name "*.tsx" -type f | while read file; do
  # Colors
  sed -i 's/bg-blue-/bg-indigo-/g' "$file"
  sed -i 's/text-blue-/text-indigo-/g' "$file"
  sed -i 's/border-blue-/border-indigo-/g' "$file"
  sed -i 's/ring-blue-/ring-indigo-/g' "$file"
  sed -i 's/from-blue-/from-indigo-/g' "$file"
  sed -i 's/to-blue-/to-indigo-/g' "$file"
  sed -i 's/shadow-blue-/shadow-indigo-/g' "$file"

  # Border radius (make more modern)
  sed -i 's/rounded-md/rounded-xl/g' "$file"
  sed -i 's/rounded-lg/rounded-2xl/g' "$file"
  sed -i 's/rounded-xl/rounded-2xl/g' "$file"
  sed -i 's/rounded-2xl/rounded-3xl/g' "$file"

  # Shadows (make more floating)
  sed -i 's/shadow-md/shadow-xl border border-slate-100/g' "$file"
  sed -i 's/shadow-sm/shadow-md border border-slate-100/g' "$file"

  # Fonts and inputs padding
  sed -i 's/font-medium/font-bold/g' "$file"
  sed -i 's/font-semibold/font-extrabold/g' "$file"
  sed -i 's/p-2/p-3/g' "$file"
  sed -i 's/py-2/py-3/g' "$file"
  sed -i 's/px-4/px-5/g' "$file"

done

echo "Styles updated."
