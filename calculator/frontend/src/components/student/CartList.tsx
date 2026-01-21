import React from 'react';
import { Trash2, Video, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";

type CartItem = {
    id: number
    displayCourseName: string
    details: { durationStr: string }
    recordingDays: number
    finalFee: number
}

const CartList = ({ cart, onRemove }: { cart: CartItem[]; onRemove: (id: number) => void }) => {
    if (cart.length === 0) return null;

    return (
        <div className="space-y-3">
            {cart.map(item => (
                <div
                    key={item.id}
                    className="relative group p-5 bg-secondary/20 rounded-2xl border border-border transition-all hover:bg-background hover:shadow-md hover:border-primary/20"
                >
                    <div className="flex justify-between items-start pr-12">
                        <div>
                            <div className="font-bold text-foreground text-lg mb-1">{item.displayCourseName}</div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1 bg-background px-2 py-1 rounded-md border border-border">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {item.details.durationStr}
                                </span>
                                {item.recordingDays > 0 && (
                                    <span className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-1 rounded-md border border-orange-100">
                                        <Video className="w-3.5 h-3.5" />
                                        녹화 {item.recordingDays}일
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="font-bold text-primary text-lg">
                            {item.finalFee.toLocaleString()}원
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(item.id)}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="제거"
                    >
                        <Trash2 className="w-5 h-5" />
                    </Button>
                </div>
            ))}
        </div>
    );
};

export default CartList;
