import { useState } from 'react';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';

function LeaderManager({ leaders, onUpdate }) {
  const [uploadingLeaderId, setUploadingLeaderId] = useState('');
  const [message, setMessage] = useState('');

  const handleAvatarUpload = async (leader, file) => {
    if (!file) {
      return;
    }

    setUploadingLeaderId(leader.id);
    setMessage(`Uploading avatar for ${leader.name}...`);

    try {
      const uploadedImage = await uploadImageToCloudinary({
        file,
        caption: `${leader.name} avatar`,
        category: 'Leader Avatar',
      });

      onUpdate(leader.id, {
        image: uploadedImage.image,
        publicId: uploadedImage.publicId,
      });

      setMessage(`${leader.name}'s avatar was updated.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploadingLeaderId('');
    }
  };

  return (
    <section className="dashboard-section">
      {message ? <p className="dashboard-message">{message}</p> : null}

      <div className="dashboard-card-grid leader-manager-grid">
        {leaders.map((leader) => (
          <article className="dashboard-image-card leader-manager-card" key={leader.id}>
            <div className="leader-manager-avatar">
              {leader.image ? (
                <img alt={`${leader.name} avatar`} src={leader.image} />
              ) : (
                <span>
                  {leader.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)}
                </span>
              )}
            </div>

            <label>
              Avatar Image
              <input
                accept="image/*"
                disabled={uploadingLeaderId === leader.id}
                onChange={(event) => handleAvatarUpload(leader, event.target.files?.[0])}
                type="file"
              />
            </label>

            <label>
              Name
              <input
                onChange={(event) => onUpdate(leader.id, { name: event.target.value })}
                value={leader.name}
              />
            </label>

            <label>
              Position
              <input
                onChange={(event) => onUpdate(leader.id, { position: event.target.value })}
                value={leader.position}
              />
            </label>

            <label>
              Biography
              <textarea
                onChange={(event) => onUpdate(leader.id, { biography: event.target.value })}
                value={leader.biography}
              />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}

export default LeaderManager;
