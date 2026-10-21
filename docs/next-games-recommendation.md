<!-- version v1.0 -->
# Đề xuất bổ sung game · Trạm Chơi

Kết luận sau khi rà soát danh mục 27 game hiện có trong `arcade.js`, kiến trúc
`games/`, `art.js` và checklist triển khai ở `docs/seven-games-plan.md`.

## Kết luận ngắn

**Nên bổ sung, nhưng chỉ 4–5 game lấp đúng chỗ trống — không thêm tràn lan.**
27 game hiện tại đã phủ khá dày; thêm nữa sẽ làm loãng thư viện và tăng gánh
nặng kiểm thử, bảo trì.

## Hiện trạng phân bổ

| Thể loại | Số game | Nhận xét |
| --- | ---: | --- |
| Bàn cờ | 10 | Rất dày (cờ vua, tướng, caro, lật, thú, cá ngựa, ô ăn quan, domino, tỷ phú, hải chiến) |
| Trí tuệ | 6 | Sudoku, 2048, dò mìn, nối thú, xếp cún, lật thẻ |
| Arcade | 4 | Xếp gạch, rắn, phá gạch, Delivery Dash |
| Bài | 3 | Tiến lên, xì dách, UNO |
| Thể thao | 2 | Đua xe đạp, bida |
| Nhập vai / Chiến thuật | 1 / 1 | Ma sói, Thủ thành |

**Chỗ trống lớn:** game ghép 3/bắn bóng, cờ đam, game chữ tiếng Việt, thể thao
nhanh (sút bóng), game thư giãn (câu cá/xếp hình), và biến thể cờ úp.

## Đề xuất theo thứ tự ưu tiên

| Game | Thể loại | Vì sao "thân thuộc, gần gũi" | Chi phí |
| --- | --- | --- | --- |
| **1. Cờ đam** | Bàn cờ, 1–2 người | Ai cũng từng chơi, đặc biệt ông bà/bố mẹ. Đối xứng tự nhiên với Cờ vua/Cờ tướng; AI minimax tái dùng từ `chess-logic.js`. | M |
| **2. Ghép 3 (Kim cương)** | Trí tuệ, 1 người | Thể loại phổ cập nhất cho phụ huynh, chị em, trẻ em. Chơi 3–5 phút, không cần AI, sinh bàn vô hạn. Dùng icon trái cây/đá quý có sẵn trong `art.js`. | M |
| **3. Sút bóng luân lưu** | Thể thao, 1–2 người | Ai cũng hiểu ngay, hợp không khí World Cup/SEA Games. Một chạm, rất hợp điện thoại. Lấp khoảng trống thể thao chỉ có 2 game. | S–M |
| **4. Phỏm** | Bài, bạn + 3 máy | Rất Việt, xuất hiện trong mọi dịp giỗ/Tết. Tái dùng UI bài của Tiến lên/UNO. | M–L |
| **5. Cờ tướng úp (mode)** | Bàn cờ | Không cần game mới: thêm chế độ giấu quân vào Cờ tướng hiện có. Dân cờ Việt rất quen, chi phí thấp, tăng replay mạnh. | S |
| 6. Đuổi hình bắt chữ | Trí tuệ/chữ | Rất Việt, gia đình và học sinh. Nhưng cần kho 150–300 câu → nặng phần nội dung. | M–L |
| 7. Piano tiles | Arcade | Giới trẻ quen, WebAudio rẻ; lưu ý bản quyền nhạc, nên dùng dân ca/public domain. | S–M |
| 8. Câu cá thư giãn | Thể thao/thư giãn | Quen, chill, hợp gia đình; cơ chế thanh lực + bộ sưu tập cá. | M |

**Nếu mục tiêu là "hấp dẫn" (giữ chân người chơi):** ưu tiên **Ghép 3** và
**Sút bóng**.

**Nếu mục tiêu là "bản sắc Việt, thân thuộc":** ưu tiên **Phỏm**,
**Cờ tướng úp**, **Đuổi hình bắt chữ**.

## Không nên thêm

- **Bầu cua, xóc đĩa, tài xỉu:** dính cờ bạc, lệch định vị "gia đình, không quảng cáo".
- **Thêm biến thể cờ vua/cờ tướng/caro na ná:** làm loãng thư viện.
- **Nông trại, nuôi thú, nấu ăn nhiều màn:** scope lớn, mang tính live-service,
  khó bảo trì cho trang tĩnh.
- **Clone Flappy Bird/Pac-Man/Among Us:** quen nhưng nhạt và dễ dính bản quyền;
  nếu làm thì làm bản gốc lấy cảm hứng.
- **Mở online cho game mới ngay:** mỗi game thêm đồng bộ lượt, reconnect, test —
  nhân đôi chi phí. Caro online hiện đã đủ.

## Gợi ý chốt cho đợt tới

**Batch 4 game:** Cờ đam + Ghép 3 + Sút bóng luân lưu + Phỏm, kèm bonus mode
**Cờ tướng úp** (rẻ, tăng chiều sâu cho game có sẵn).

Lý do chọn batch này: phủ 3 khoảng trống lớn (cờ kinh điển, casual giải trí,
thể thao nhanh), có 2 game rất Việt, đều chơi được offline, không cần server,
và tái sử dụng nhiều hạ tầng có sẵn.

## Lưu ý chi phí triển khai

Mỗi game cần tối thiểu:

- `games/<id>-logic.js` — luật, AI, kiểm thử được bằng Node.
- `games/<id>.js` — UI, đăng ký `ArcadeGames[id]`, dùng `ArcadeShared`.
- `games/<id>.css` — bố cục 2D, responsive.
- `tests/<id>.test.cjs` — test luật và tình huống biên.
- `tests/browser-<id>.cjs` — test Chromium/WebKit ở 5 viewport.
- `docs/<id>.md` — luật, biến thể, điều khiển.
- Metadata trong `arcade.js`, cover SVG trong `art.js`.
- Cập nhật README/package/index (đang ghi "27 game" ở nhiều chỗ).

Vì vậy nên làm **tối đa 4 game/đợt** theo đúng checklist
`docs/seven-games-plan.md`.

## Bước tiếp theo

1. Viết `docs/next-games-plan.md` chi tiết cho 4 game trên (phạm vi, luật, file,
   test) để duyệt trước.
2. Làm thử **Cờ đam** trước (nhanh, ít rủi ro, thấy kết quả sớm).
3. Làm **Ghép 3** trước (hấp dẫn/giữ chân nhất).
4. Chỉ dừng ở tư vấn, chưa code.
