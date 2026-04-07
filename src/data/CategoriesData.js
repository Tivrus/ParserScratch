// Categories data (have indentifier, color, name and flag "original")
const categories_array = [
    { key: "Motion", color: "#4C97FF", text: "Движения"},
    { key: "Looks", color: "#9966FF", text: "Внешний вид" },
    { key: "Sound", color: "#CF63CF", text: "Звуки" }, 
    { key: "Events", color: "#FFBF00", text: "События"},
    { key: "Control", color: "#FFAB19", text: "Управление" }
];


const categories_map = new Map(categories_array.map(c => [c.key, c]));
export { categories_array, categories_map };