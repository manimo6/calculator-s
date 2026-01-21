import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal'; // Reuse the generic modal

type CategoryModalProps = {
    isOpen: boolean
    onClose: () => void
    onSave: (name: string, originalName?: string) => void
    editingCategory?: string
}

const CategoryModal = ({ isOpen, onClose, onSave, editingCategory }: CategoryModalProps) => {
    const [catName, setCatName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCatName(editingCategory || '');
        }
    }, [isOpen, editingCategory]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(catName, editingCategory);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingCategory ? "카테고리 수정" : "카테고리 추가"}
        >
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">카테고리 이름</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="예: SAT"
                        required
                        value={catName}
                        onChange={e => setCatName(e.target.value)}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div className="modal-footer" style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button type="button" className="action-btn btn-outline" onClick={onClose} style={{ marginRight: '8px' }}>취소</button>
                    <button type="submit" className="action-btn btn-primary">확인</button>
                </div>
            </form>
        </Modal>
    );
};

export default CategoryModal;
