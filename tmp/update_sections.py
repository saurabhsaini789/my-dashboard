import os

def update_file(path, search_text, replace_text):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if search_text in content:
        new_content = content.replace(search_text, replace_text)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {path}")
    else:
        # Try without original indentation
        print(f"Could not find exact text in {path}")
        # Try a more flexible search
        import re
        # Escape search_text if it has special characters, but we want to match whitespace flexibly
        # Replace the literal spaces at the start with \s*
        pattern = re.escape(search_text.strip())
        pattern = r'\s*' + pattern
        if re.search(pattern, content):
            new_content = re.sub(pattern, replace_text, content)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {path} using regex")
        else:
            print(f"Pattern not found in {path}")

# IncomeSection.tsx
income_path = r'c:\Users\saura\Documents\My Dashboard\src\components\finances\IncomeSection.tsx'
search_income = """                                           {record.currency === 'CAD' ? 'C$' : '₹'}{record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </span>
                                       {record.currency === 'CAD' && (
                                           <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                                               CAD Record
                                           </div>
                                       )}"""
replace_income = """                                           {record.currency === 'CAD' ? `C$${record.amount.toLocaleString('en-IN')}` : `₹${record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                       </span>
                                       <span className="text-[10px] text-zinc-500 uppercase tracking-tighter block text-right">
                                           {record.currency === 'CAD' 
                                            ? `(₹${convertToINR(record.amount, 'CAD').toLocaleString('en-IN', { maximumFractionDigits: 0 })})` 
                                            : `(CAD $${convertToCAD(record.amount).toLocaleString('en-US', { maximumFractionDigits: 0 })})`}
                                       </span>"""

# ExpenseSection.tsx
expense_path = r'c:\Users\saura\Documents\My Dashboard\src\components\finances\ExpenseSection.tsx'
search_expense = """                                           {record.currency === 'CAD' ? 'C$' : '₹'}{record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </span>
                                       {record.currency === 'CAD' && (
                                           <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                                               CAD Record
                                           </div>
                                       )}"""
replace_expense = """                                           {record.currency === 'CAD' ? `C$${record.amount.toLocaleString('en-IN')}` : `₹${record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                       </span>
                                       <span className="text-[10px] text-zinc-500 uppercase tracking-tighter block text-right">
                                           {record.currency === 'CAD' 
                                            ? `(₹${convertToINR(record.amount, 'CAD').toLocaleString('en-IN', { maximumFractionDigits: 0 })})` 
                                            : `(CAD $${convertToCAD(record.amount).toLocaleString('en-US', { maximumFractionDigits: 0 })})`}
                                       </span>"""

update_file(income_path, search_income, replace_income)
update_file(expense_path, search_expense, replace_expense)
