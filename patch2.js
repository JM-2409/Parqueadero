const fs = require('fs');
const content = fs.readFileSync('app/admin/page.tsx', 'utf8');

let newContent = content;

if(newContent.includes('import { GripVertical } from \'lucide-react\';')) {
    newContent = newContent.replace(
        'import { GripVertical } from \'lucide-react\';',
        'import { GripVertical, ArrowUp, ArrowDown } from \'lucide-react\';'
    );
}

const functionsToAdd = `
  const moveCustomField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setCustomFields(arrayMove(customFields, index, index - 1));
    } else if (direction === 'down' && index < customFields.length - 1) {
      setCustomFields(arrayMove(customFields, index, index + 1));
    }
  };

  const movePrivateCustomField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setPrivateCustomFields(arrayMove(privateCustomFields, index, index - 1));
    } else if (direction === 'down' && index < privateCustomFields.length - 1) {
      setPrivateCustomFields(arrayMove(privateCustomFields, index, index + 1));
    }
  };
`;

const handlePrivateCustomFieldsDragEnd = `  const handlePrivateCustomFieldsDragEnd = (event: DragEndEvent) => {`;

if (newContent.includes(handlePrivateCustomFieldsDragEnd) && !newContent.includes('moveCustomField')) {
    newContent = newContent.replace(handlePrivateCustomFieldsDragEnd, functionsToAdd + '\n' + handlePrivateCustomFieldsDragEnd);
}

const customFieldRow = `<div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 px-2 flex items-center justify-center">
                                      <GripVertical size={20} />
                                    </div>`;

const customFieldRowReplacement = `<div className="flex items-center gap-1">
                                      <div className="hidden sm:flex cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 px-2 items-center justify-center">
                                        <GripVertical size={20} />
                                      </div>
                                      <div className="flex sm:hidden flex-col gap-1 px-1">
                                        <button
                                          type="button"
                                          onClick={() => moveCustomField(idx, 'up')}
                                          disabled={idx === 0}
                                          className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          <ArrowUp size={16} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => moveCustomField(idx, 'down')}
                                          disabled={idx === customFields.length - 1}
                                          className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          <ArrowDown size={16} />
                                        </button>
                                      </div>
                                    </div>`;

const privateCustomFieldRowReplacement = `<div className="flex items-center gap-1">
                                      <div className="hidden sm:flex cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 px-2 items-center justify-center">
                                        <GripVertical size={20} />
                                      </div>
                                      <div className="flex sm:hidden flex-col gap-1 px-1">
                                        <button
                                          type="button"
                                          onClick={() => movePrivateCustomField(idx, 'up')}
                                          disabled={idx === 0}
                                          className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          <ArrowUp size={16} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => movePrivateCustomField(idx, 'down')}
                                          disabled={idx === privateCustomFields.length - 1}
                                          className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          <ArrowDown size={16} />
                                        </button>
                                      </div>
                                    </div>`;


let occurrences = 0;
newContent = newContent.replace(new RegExp(customFieldRow.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'), 'g'), (match) => {
    occurrences++;
    if (occurrences === 1) {
        return customFieldRowReplacement;
    } else if (occurrences === 2) {
        return privateCustomFieldRowReplacement;
    }
    return match;
});

if (content !== newContent) {
    fs.writeFileSync('app/admin/page.tsx', newContent);
    console.log("Patched successfully");
} else {
    console.log("Could not find content to replace.");
}
