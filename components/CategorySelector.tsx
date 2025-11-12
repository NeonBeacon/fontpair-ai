import React from 'react';

interface CategorySelectorProps {
    title: string;
    categories: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ title, categories, selected, onChange }) => {
    const toggleCategory = (category: string) => {
        if (selected.includes(category)) {
            onChange(selected.filter(c => c !== category));
        } else {
            onChange([...selected, category]);
        }
    };

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-primary mb-3">
                {title}
            </label>
            <div className="flex flex-wrap gap-2">
                {categories.map(category => {
                    const isSelected = selected.includes(category);
                    return (
                        <button
                            key={category}
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                isSelected
                                    ? 'bg-accent text-surface'
                                    : 'bg-surface text-secondary border border-border hover:border-accent hover:text-accent'
                            }`}
                        >
                            {category}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CategorySelector;
