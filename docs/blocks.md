<!-- version v1.0 -->
# Xếp gạch rơi

Game một người với giếng 10 cột × 20 hàng. Xếp kín một hàng ngang để xóa hàng đó; chạm trần khi khóa khối hoặc không còn chỗ sinh khối mới sẽ kết thúc ván. Có bóng vị trí rơi, ba khối kế tiếp và một ô giữ khối. Bảy dạng I, J, L, O, S, T, Z được xáo thành từng túi đủ bảy dạng để tránh chuỗi thiếu khối quá dài.

## Điều khiển

| Thao tác | Bàn phím | Điện thoại / máy tính bảng |
| --- | --- | --- |
| Sang trái / phải | ← / →, giữ để lặp | Nút ← / →, giữ để lặp |
| Xoay phải / trái | ↑ hoặc X / Z | Nút ↻ / ↺ |
| Hạ chậm | ↓, giữ để lặp | Nút ↓, giữ để lặp |
| Thả ngay và khóa | Space | Nút Thả ngay |
| Giữ / đổi khối | C hoặc Shift | Nút Giữ khối |
| Tạm dừng | P hoặc nút chung | Nút tạm dừng của thư viện |

Chỉ được giữ/đổi một lần trước khi khóa khối hiện tại. Khối lấy từ ô giữ quay về hướng và vị trí sinh ban đầu. Bóng viền mờ biểu thị đúng vị trí khối sẽ đến khi thả ngay.

Bàn tự điều chỉnh kích thước theo chiều cao vùng chơi, giữ tỷ lệ 10×20. Trên điện thoại dọc, bảy nút chia thành hai hàng; trên màn hình rộng dùng một hàng. Bộ kiểm thử kiểm tra toàn bàn và cả bảy nút cùng nằm trong vùng nhìn thấy ở các kích thước đã nêu bên dưới, với nút tối thiểu 44×44 px.

## Luật và điểm

- Xóa 1 / 2 / 3 / 4 hàng cùng lúc: 100 / 300 / 500 / 800 điểm × cấp hiện tại.
- Mỗi lần khóa khối mà tiếp tục xóa hàng nối dài combo: thưởng 50 × số lần nối thêm × cấp. Khóa một khối không xóa hàng sẽ ngắt combo.
- Hạ chậm: 1 điểm mỗi ô; thả ngay: 2 điểm mỗi ô.
- Cứ tổng cộng 10 hàng lên một cấp. Chu kỳ rơi bắt đầu 0,8 giây/ô, nhân 0,85 mỗi cấp, giới hạn nhanh nhất 0,075 giây/ô.
- Chạm đáy có 0,5 giây để chỉnh khối. Một lần di chuyển hoặc xoay hợp lệ khi đang chạm đáy sẽ đặt lại thời gian, tối đa 15 lần/khối. Đi không hợp lệ không kéo dài thời gian khóa.
- Hệ xoay riêng, không phải SRS: xoay ma trận quanh tâm của từng khuôn; O giữ nguyên. Khi bị vướng, thử lần lượt các độ dịch (x, y): (0,0), (-1,0), (1,0), (-2,0), (2,0), (0,-1), (-1,-1), (1,-1), (0,-2). Không có T-spin hoặc thưởng back-to-back trong bản này.

## Cấu trúc và kiểm thử

`games/blocks-logic.js` xuất UMD `ArcadeBlocks`; UI `ArcadeGames.blocks` dùng scope chung cho vòng lặp, listener, tạm dừng và hủy game. Logic cập nhật bước cố định 1/120 giây, giới hạn một lượt cập nhật tối đa 0,25 giây để tab chậm không làm khối rơi tức thì. UI dùng canvas và các nút HTML; giữ phím/chạm được xóa khi mất focus, đổi tab, tạm dừng, chơi lại hoặc đóng game. Không tải tài nguyên hay gọi mạng khi chơi.

Chạy kiểm thử luật: `node --test tests/blocks.test.cjs`. Kiểm thử bao gồm túi bảy khối, xoay và va chạm, bóng rơi, hạ/thả, xóa hàng, điểm và combo, giữ khối, chạm trần, thời gian khóa có giới hạn, chia bước thời gian và 150 ván ngẫu nhiên có seed với kiểm tra bảo toàn số ô.

Chạy kiểm thử trình duyệt qua server thư viện: `node tests/browser-blocks.cjs`. Dùng bộ chạy `browser-expansion-kit.cjs`: Chromium và WebKit, chức năng ở 1366×900 và thao tác cảm ứng tại 320×740, 390×844, 820×1180, cùng desktop 1366×900. Bộ kiểm tra gồm điều khiển, giữ khối, tạm dừng, mất focus, fixture xóa bốn hàng, kết thúc/chơi lại, tràn ngang và vòng đời khi đóng. Đây là mô phỏng kích thước/DPR/cảm ứng trên máy Windows, không phải máy ảo hoặc thiết bị iOS thật. Kết quả chạy thực tế được ghi vào báo cáo kiểm thử chung của đợt mở rộng.
