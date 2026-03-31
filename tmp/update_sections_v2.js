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
        // Try trimming search text's each line and then search
        const lines = content.split('\n');
        const searchLines = searchText.trim().split('\n').map(l => l.trim());
        
        let foundIndex = -1;
        for (let i = 0; i <= lines.length - searchLines.length; i++) {
            let match = true;
            for (let j = 0; j < searchLines.length; j++) {
                if (lines[i + j].trim() !== searchLines[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                foundIndex = i;
                break;
            }
        }
        
        if (foundIndex !== -1) {
            console.log(`Found match at line ${foundIndex + 1} with flexible indentation.`);
            const leadingSpaces = lines[foundIndex].match(/^\s*/)[0];
            const indentedReplace = replaceText.split('\n').map(l => leadingSpaces + l.trim()).join('\n');
            lines.splice(foundIndex, searchLines.length, indentedReplace);
            fs.writeFileSync(path, lines.join('\n'), 'utf8');
            console.log(`Updated ${path} with flexible indentation.`);
        } else {
            console.log(`Could not find flexible match in ${path}`);
        }
    }
}

const incomePath = 'c:\\Users\\saura\\Documents\\My Dashboard\\src\\components\\finances\\IncomeSection.tsx';

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
