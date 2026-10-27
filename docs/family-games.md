# Sáu game gia đình

Thêm 4 game nhóm A và chọn **Nối chữ tiếng Việt**, **Câu cá thư giãn** ở nhóm B.
Tất cả dùng JavaScript/CSS/SVG cục bộ, hỗ trợ HTTP và mở `index.html` trực tiếp.
Mỗi game dùng vòng đời chung: tạm dừng, ẩn tab, chơi lại và thoát sẽ dừng hoặc hủy đúng timer/input.

| Game | Đường dẫn | Luật / phạm vi |
| --- | --- | --- |
| Cờ đam | `/#play/draughts` | Luật Anh 8 × 8, 12 quân mỗi bên. Quân thường chỉ đi/bắt tiến; vua một ô chéo hai hướng. Bắt bắt buộc, phải hoàn thành chuỗi, được chọn chuỗi bất kỳ; phong vua dừng lượt. Hết nước/quân là thua. Tự hòa lặp 3 lần hoặc 80 lượt chỉ đi vua không bắt. Máy Dễ/Vừa dùng minimax alpha-beta, 2 người cùng thiết bị, gợi ý, hoàn tác. |
| Ghép 3 | `/#play/match3` | 8 × 8, 6 hình/màu khác nhau, 30 lượt hợp lệ. 10 điểm mỗi viên × chuỗi rơi. Đổi sai không mất lượt. Không có bộ ba sẵn ở bàn đầu; luôn có nước đi. Hết nước tự tạo bàn mới giữ điểm/lượt. Giới hạn chuỗi tự rơi để tránh khóa ván với nguồn ngẫu nhiên bất thường. |
| Phỏm | `/#play/phom` | 52 lá; người 0 có 10 lá, 3 máy có 9 lá. Ăn/bốc rồi đánh. A thấp, không K–A. Bộ cùng số 3–4 lá hoặc dây cùng chất ≥3 lá. Mỗi phỏm tối đa 1 lá ăn; mọi lá ăn được bảo vệ. Hết rác là ù. |
| Luân lưu | `/#play/penalty` | Sút/bắt 6 vùng, đoán đúng cản phá. Máy quyết định kín trước input. 5 quả mỗi đội, kết thúc sớm khi không thể gỡ; hòa thì đá từng cặp. 2 người chuyền thiết bị, thủ môn chọn kín trước người sút. |
| Nối chữ | `/#play/wordchain` | Từ điển chọn sẵn trong `wordchain-logic.js`, tiếng cuối nối tiếng đầu, không lặp, giữ dấu/NFC. 90 giây, +10 mỗi từ, +50 khi máy hết từ, 3 gợi ý mỗi lần −5 (không âm). Máy ưu tiên từ còn nhánh để người chơi nối tiếp. Không nhận mọi từ tiếng Việt. |
| Câu cá | `/#play/fishing` | Canh lực, chờ cá, giật trong 2,5 giây, giữ/thả kéo để giữ lực trong vùng xanh. Không giới hạn lượt/thời gian. 6 loài có trọng số hiếm và tốc độ riêng. Bộ sưu tập lưu cục bộ, Chơi lại chỉ đặt lại buổi câu. Khi storage không khả dụng vẫn chơi và lưu tạm trong phiên. |

## Biến thể Phỏm

Bàn gia đình có **4 lượt đánh cố định mỗi người**, không tái/đền/cược tiền/phạt ăn chốt.
Lượt đánh cuối tự chọn cách hạ ít điểm rác nhất, sau đó tự gửi bài vào phỏm người đã hạ trước nếu người gửi có phỏm.
Gửi không làm thay đổi thứ tự hạ. Có phỏm luôn xếp trước móm; ít điểm hơn xếp trước; bằng điểm ưu tiên thứ tự hạ (Bạn, Máy 1, Máy 2, Máy 3).
A=1, J=11, Q=12, K=13. Không cho đánh lại lá đã ăn hoặc phá cấu trúc bảo vệ lá ăn.
Bộ giải phỏm xét các cách chia không chồng lá để tránh ghép tham lam sai ở bài vừa có sảnh vừa có bộ cùng số. Gửi hết bài rác cũng kết thúc ván bằng ù.
Máy chỉ đánh giá bài mình và bài công khai; không dùng nọc hay bài úp của đối phương để chọn lá đánh.

## Kiểm thử

```sh
npm test
npm run check
npm start
npm run test:family:browser
```

`tests/family.test.cjs` kiểm tra luật, chuỗi bắt/phong vua/hòa, bàn Ghép 3 và cascade, bảo toàn 52 lá và toàn ván Phỏm, luân lưu quyết định, từ điển và phiên câu cá.
`tests/browser-family.cjs` kiểm tra mở từ thư viện, thao tác chơi thật, tạm dừng/chơi lại/thoát, viewport desktop/mobile, lưu bộ sưu tập và chạy `file://`. Cần Playwright có sẵn; dùng Edge trên Windows hoặc `BROWSER_PATH` nếu chỉ định trình duyệt khác.

Luật Cờ đam tham khảo [WCDF — Rules of English Draughts](https://wcdf.net/rules/rules_of_checkers_english.pdf). Tự động tuyên hòa là quy ước của ứng dụng; không mô phỏng thủ tục yêu cầu trọng tài.
