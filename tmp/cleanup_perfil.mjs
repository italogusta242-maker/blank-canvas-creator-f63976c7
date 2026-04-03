import fs from 'fs';
const path = 'src/pages/Perfil.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove Message Button
const buttonRegex = /<button className="flex-1 h-10 rounded-xl border border-border bg-card font-bold text-sm flex items-center justify-center gap-2">\s*<MessageCircle size=\{16\} \/> Mensagem\s*<\/button>/g;
content = content.replace(buttonRegex, '');

// Adjust Seguir button to flex-1 -> w-full if needed, or just let the div handle it
content = content.replace(/className={`flex-1 h-10 rounded-xl/g, 'className={`w-full h-10 rounded-xl');
content = content.replace(/<div className="flex gap-2 w-full pt-2">/g, '<div className="w-full pt-2">');

// Remove Subscription Sheet
const sheetRegex = /\{\/\* Subscription Sheet \*\/ \}\s*<Sheet open=\{subscriptionOpen\} onOpenChange=\{setSubscriptionOpen\}>[\s\S]*?<\/Sheet>/g;
content = content.replace(sheetRegex, '');

fs.writeFileSync(path, content);
console.log('Perfil.tsx cleaned up successfully');
