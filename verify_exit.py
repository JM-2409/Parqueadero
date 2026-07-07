import re

with open('app/employee/page.tsx', 'r') as f:
    content = f.read()

# Verify that the exit generation logic is as expected
if 'let receiptNumber = sessionToExit.receipt_number;' in content:
    print("Verification passed")
else:
    print("Verification failed")
