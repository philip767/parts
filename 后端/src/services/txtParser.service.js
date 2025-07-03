exports.parseTxtFile = (fileContent) => {
    const lines = fileContent.toString('utf-8').split(/\r?\n/).filter(line => line.trim() !== '');
    const parts = [];

    for (const line of lines) {
        const values = line.split(',').map(v => v.trim());
        if (values.length < 3) continue;

        const [partNumber, partName, quantityStr, ...notesArr] = values;
        const quantity = parseInt(quantityStr, 10);

        if (!partNumber || !partName || isNaN(quantity)) continue;

        parts.push({
            partNumber,
            partName,
            quantity,
            notesText: notesArr.join(',') || '无初始备注',
        });
    }
    return parts;
};
