const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NoteImage = sequelize.define('NoteImage', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    imageUrlOrPath: { type: DataTypes.STRING(1024), allowNull: false },
    imageName: { type: DataTypes.STRING, allowNull: false },
    imageType: { type: DataTypes.STRING, allowNull: false },
    uploadedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });
  return NoteImage;
};
