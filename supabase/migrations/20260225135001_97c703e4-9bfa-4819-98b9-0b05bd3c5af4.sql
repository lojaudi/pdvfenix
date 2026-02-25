-- Allow staff to delete order items (for canceling items from open orders)
CREATE POLICY "Staff can delete order items"
ON public.order_items
FOR DELETE
USING (is_staff(auth.uid()));