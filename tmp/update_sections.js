const fs = require('fs');

function updateFile(path, searchText, replaceText) {
    if (!fs.existsSync(path)) {
        console.log(`File not found: ${path}`);
        return;
    }
    const content = fs.readFileSync(path, 'utf8');
    
    if (content.includes(searchText)) {
        const newContent = content.replace(searchText, replaceText);
        fs.writeFileSync(path, newContent, 'utf8');
        console.log(`Updated ${path}`);
    } else {
        console.log(`Could not find exact text in ${path}`);
        // Try more flexible search by trimming and using regex if needed, but let's try a smaller fragment
        const fragment = searchText.trim().split('\n')[0].trim();
        console.log(`Searching for fragment: ${fragment}`);
        if (content.includes(fragment)) {
            console.log(`Fragment found, but full block matched unsuccessfully. Check indentation.`);
        }
    }
}

const incomePath = 'c:\\Users\\saura\\Documents\\My Dashboard\\src\\components\\finances\\IncomeSection.tsx';
const expensePath = 'c:\\Users\\saura\\Documents\\My Dashboard\\src\\components\\finances\\ExpenseSection.tsx';

// We use simpler strings to avoid indentation mismatch
const searchFragment = "{record.currency === 'CAD' ? 'C$' : '₹'}{record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}";
const replaceFragment = "{record.currency === 'CAD' ? `C$${record.amount.toLocaleString('en-IN')}` : `₹${record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}\n                                       </span>\n                                       <span className=\"text-[10px] text-zinc-500 uppercase tracking-tighter block text-right\">\n                                           {record.currency === 'CAD' \n                                            ? `(₹${convertToINR(record.amount, 'CAD').toLocaleString('en-IN', { maximumFractionDigits: 0 })})` \n                                            : `(CAD $${convertToCAD(record.amount).toLocaleString('en-US', { maximumFractionDigits: 0 })})`}\n                                       </span>";

// But wait, the replaceFragment replaces more than just the searchFragment.
// I'll replace the whole block including the following lines.

const searchBlock = `                                           {record.currency === 'CAD' ? 'C$' : '₹'}{record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </span>
                                       {record.currency === 'CAD' && (
                                           <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                                               CAD Record
                                           </div>
                                       )}`;

const replaceBlock = `                                           {record.currency === 'CAD' ? \`C$\${record.amount.toLocaleString('en-IN')}\` : \`₹\${record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\`}
                                       </span>
                                       <span className="text-[10px] text-zinc-500 uppercase tracking-tighter block text-right">
                                           {record.currency === 'CAD' 
                                            ? \`(₹\${convertToINR(record.amount, 'CAD').toLocaleString('en-IN', { maximumFractionDigits: 0 })})\` 
                                            : \`(CAD $\${convertToCAD(record.amount).toLocaleString('en-US', { maximumFractionDigits: 0 })})\`}
                                       </span>`;

updateFile(incomePath, searchBlock, replaceBlock);
updateFile(expensePath, searchBlock, replaceBlock);
